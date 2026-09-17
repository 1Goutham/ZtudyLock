import "server-only";
import type { AiError, AiResponse } from "../contracts";
import type { CompletionOptions, Provider, ProviderId, ProviderStatus } from "./types";

/**
 * Any OpenAI-compatible chat endpoint: Groq, OpenRouter, Cerebras, Mistral,
 * Together, a local Ollama. One adapter, many free tiers.
 */

const TIMEOUT_MS = 60_000;
const CACHE_MS = 60 * 60 * 1000;

export interface CompatibleConfig {
  id: ProviderId;
  label: string;
  signupUrl: string;
  baseUrl: string;
  apiKey: () => string | undefined;
  model: () => string | undefined;
  defaultModels: string[];
  supportsJsonMode: boolean;
  extraHeaders?: Record<string, string>;
  note?: string;
}

function err(code: AiError["code"], message: string, retryable = false): AiResponse<never> {
  return { ok: false, error: { code, message, retryable } };
}

export function scoreCompatibleModel(id: string): number | null {
  const name = id.toLowerCase();
  if (/(whisper|tts|embed|guard|moderation|vision|audio|image|rerank|ocr|transcri|safeguard|prompt-guard|compound|playai)/.test(name)) return null;
  let score = 0;
  const size = /(\d+)b\b/.exec(name);
  if (size) score += Math.min(Number(size[1]), 600);
  if (/versatile|instruct|chat/.test(name)) score += 20;
  if (/maverick|scout|llama-4/.test(name)) score += 120;
  if (/llama-3\.3/.test(name)) score += 40;
  if (/qwen|deepseek|mistral|gemma|gpt-oss|kimi/.test(name)) score += 10;
  if (/:free$/.test(name)) score += 5;
  if (/preview|beta|exp/.test(name)) score -= 15;
  if (/mini|nano|1b|3b|8b(?!\d)/.test(name)) score -= 10;
  return score;
}

export function createCompatibleProvider(cfg: CompatibleConfig): Provider {
  let cache: { model: string; at: number } | null = null;

  async function listModels(key: string): Promise<string[] | null> {
    try {
      const res = await fetch(`${cfg.baseUrl}/models`, { headers: { Authorization: `Bearer ${key}`, ...cfg.extraHeaders }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
      return (data?.data ?? []).map((m) => m.id).filter((x): x is string => !!x);
    } catch {
      return null;
    }
  }

  async function resolveModel(key: string): Promise<string> {
    const pinned = cfg.model();
    if (pinned) return pinned;
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.model;
    const available = await listModels(key);
    let model = cfg.defaultModels[0];
    if (available?.length) {
      const known = cfg.defaultModels.find((m) => available.includes(m));
      if (known) model = known;
      else {
        const ranked = available
          .map((id) => ({ id, score: scoreCompatibleModel(id) }))
          .filter((x): x is { id: string; score: number } => x.score !== null)
          .sort((a, b) => b.score - a.score);
        if (ranked.length) model = ranked[0].id;
      }
    }
    cache = { model, at: Date.now() };
    console.info(`ZtudyLock: using ${cfg.label} model "${model}".`);
    return model;
  }

  async function request(key: string, model: string, opts: CompletionOptions): Promise<Response | AiResponse<never>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...cfg.extraHeaders },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxOutputTokens ?? 2048,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.prompt },
          ],
          ...(opts.json && cfg.supportsJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return err("timeout", `${cfg.label} took too long to respond.`, true);
      return err("network", `Couldn't reach ${cfg.label}.`, true);
    } finally {
      clearTimeout(timer);
    }
  }

  function extractMessage(body: string): string {
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } | string };
      const e = parsed.error;
      const msg = typeof e === "string" ? e : e?.message;
      return msg?.trim().slice(0, 160) ?? "";
    } catch {
      return "";
    }
  }

  return {
    id: cfg.id,
    label: cfg.label,
    signupUrl: cfg.signupUrl,
    supportsImages: false,
    configured: () => !!cfg.apiKey(),

    async complete(opts) {
      const key = cfg.apiKey();
      if (!key) return err("not_configured", `${cfg.label} is not configured.`);
      if (opts.images?.length) return err("not_configured", `${cfg.label} can't read images.`);

      let model = await resolveModel(key);
      let res = await request(key, model, opts);

      if (res instanceof Response && res.status === 404 && !cfg.model()) {
        const idx = cfg.defaultModels.indexOf(model);
        const next = cfg.defaultModels[idx + 1];
        if (next) {
          cache = { model: next, at: Date.now() };
          model = next;
          res = await request(key, model, opts);
        }
      }
      if (!(res instanceof Response)) return res;

      if (res.status === 429) return { ...err("rate_limited", `${cfg.label}'s free tier is rate-limited right now.`, true), model };
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 500);
        console.error(`${cfg.label} error:`, res.status, model, detail);
        const reason = extractMessage(detail);
        if (res.status === 404) return { ...err("upstream", `${cfg.label} can't find the model "${model}".`), model };
        if (res.status === 400 || res.status === 401 || res.status === 403) return { ...err("upstream", `${cfg.label} rejected the request (${res.status})${reason ? `: ${reason}` : ""}.`), model };
        return { ...err("upstream", `${cfg.label} had a problem (${res.status})${reason ? `: ${reason}` : ""}.`, res.status >= 500), model };
      }

      let payload: { choices?: { message?: { content?: string | { text?: string }[] }; finish_reason?: string }[] };
      try {
        payload = await res.json();
      } catch {
        return { ...err("malformed", `${cfg.label} returned something unreadable.`, true), model };
      }
      const choice = payload.choices?.[0];
      const raw = choice?.message?.content;
      const text = (Array.isArray(raw) ? raw.map((p) => p.text ?? "").join("") : (raw ?? "")).trim();
      if (!text) {
        if (choice?.finish_reason === "content_filter") return { ...err("blocked", `${cfg.label} declined this request. Try rephrasing.`), model };
        return { ...err("empty", `${cfg.label} came back empty-handed.`, true), model };
      }
      return { ok: true, data: text, model };
    },

    async status(): Promise<ProviderStatus> {
      const key = cfg.apiKey();
      return { id: cfg.id, label: cfg.label, signupUrl: cfg.signupUrl, configured: !!key, model: key ? await resolveModel(key).catch(() => null) : null, note: cfg.note };
    },
  };
}
