import "server-only";
import type { AiError, AiResponse } from "../contracts";
import { invalidateModelCache, resolveModel } from "./geminiModels";
import type { CompletionOptions, Provider, ProviderStatus } from "./types";

/**
 * Google Gemini. The best free tier for this workload: no card required,
 * strong instruction following, native JSON mode, vision for transcribing
 * photographed notes.
 */

const BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const TIMEOUT_MS = 50_000;
const SIGNUP = "https://aistudio.google.com/apikey";

function err(code: AiError["code"], message: string, retryable = false): AiResponse<never> {
  return { ok: false, error: { code, message, retryable } };
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

async function request(key: string, model: string, opts: CompletionOptions): Promise<Response | AiResponse<never>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const parts: Record<string, unknown>[] = [{ text: opts.prompt }];
  for (const img of opts.images ?? []) parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
  try {
    return await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: opts.temperature ?? 0.6,
          maxOutputTokens: opts.maxOutputTokens ?? 2048,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return err("timeout", "Gemini took too long to respond.", true);
    return err("network", "Couldn't reach Gemini.", true);
  } finally {
    clearTimeout(timer);
  }
}

function extractMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message?.trim().slice(0, 160) ?? "";
  } catch {
    return "";
  }
}

export const gemini: Provider = {
  id: "gemini",
  label: "Google Gemini",
  signupUrl: SIGNUP,
  supportsImages: true,
  configured: () => !!process.env.GEMINI_API_KEY,

  async complete(opts) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return err("not_configured", "Gemini is not configured.");

    let model = await resolveModel(key);
    let res = await request(key, model, opts);

    if (res instanceof Response && res.status === 404) {
      invalidateModelCache();
      const next = await resolveModel(key);
      if (next !== model) {
        model = next;
        res = await request(key, model, opts);
      }
    }
    if (!(res instanceof Response)) return res;

    if (res.status === 429) return { ...err("rate_limited", "Gemini's free tier is rate-limited right now.", true), model };
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 500);
      console.error("Gemini error:", res.status, model, detail);
      const reason = extractMessage(detail);
      if (res.status === 404) return { ...err("upstream", `Gemini can't find the model "${model}". Set GEMINI_MODEL to a current model.`), model };
      if (res.status === 400 || res.status === 401 || res.status === 403) return { ...err("upstream", `Gemini rejected the request (${res.status})${reason ? `: ${reason}` : ""}.`), model };
      return { ...err("upstream", `Gemini had a problem (${res.status})${reason ? `: ${reason}` : ""}.`, res.status >= 500), model };
    }

    let payload: GeminiPayload;
    try {
      payload = (await res.json()) as GeminiPayload;
    } catch {
      return { ...err("malformed", "Gemini returned something unreadable.", true), model };
    }
    if (payload.promptFeedback?.blockReason) return { ...err("blocked", "Gemini declined this request. Try rephrasing."), model };
    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) {
      if (candidate?.finishReason === "SAFETY") return { ...err("blocked", "Gemini declined this request. Try rephrasing."), model };
      return { ...err("empty", "Gemini came back empty-handed.", true), model };
    }
    return { ok: true, data: text, model };
  },

  async status(): Promise<ProviderStatus> {
    const key = process.env.GEMINI_API_KEY;
    return {
      id: "gemini",
      label: "Google Gemini",
      signupUrl: SIGNUP,
      configured: !!key,
      model: key ? await resolveModel(key).catch(() => null) : null,
      note: "Free tier, no card. Best quality for this workload; reads images.",
    };
  },
};
