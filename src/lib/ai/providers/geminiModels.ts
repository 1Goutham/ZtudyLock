import "server-only";

/**
 * Model resolution. Gemini model IDs are retired regularly, so ZtudyLock
 * never hardcodes one: it asks the API which models this key can use, prefers
 * the newest stable Flash model, and caches the answer for an hour.
 * `GEMINI_MODEL` wins when it is set and available.
 */

const BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const CACHE_MS = 60 * 60 * 1000;
const LAST_RESORT = "gemini-flash-latest";

interface ListedModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

let cache: { model: string; at: number } | null = null;

export function invalidateModelCache() {
  cache = null;
}

export function scoreModel(name: string): number | null {
  const m = /^gemini-(\d+)(?:\.(\d+))?-(flash|pro)(.*)$/.exec(name);
  if (!m) return null;
  const suffix = m[4];
  if (/(tts|image|audio|live|omni|embedding|thinking|computer|robotics|native|vision|deep|research)/i.test(suffix)) return null;
  let score = Number(m[1]) * 100 + Number(m[2] ?? 0) * 10;
  score += m[3] === "flash" ? 5 : 3;
  if (/lite/i.test(suffix)) score -= 2;
  if (/preview|exp/i.test(suffix)) score -= 4;
  if (/-\d{2,}$/.test(suffix)) score -= 1;
  return score;
}

export function pickModel(available: string[], preferred?: string): string | null {
  if (preferred && available.includes(preferred)) return preferred;
  const ranked = available
    .map((name) => ({ name, score: scoreModel(name) }))
    .filter((x): x is { name: string; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score);
  if (ranked.length) return ranked[0].name;
  return available.find((n) => /^gemini-flash-latest$/.test(n)) ?? available.find((n) => /^gemini-.*-latest$/.test(n)) ?? null;
}

async function listModels(key: string): Promise<string[] | null> {
  const names: string[] = [];
  let pageToken = "";
  for (let page = 0; page < 3; page++) {
    const url = `${BASE}/v1beta/models?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10_000) });
    } catch {
      return null;
    }
    if (!res.ok) {
      console.error("Gemini ListModels failed:", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    const data = (await res.json().catch(() => null)) as { models?: ListedModel[]; nextPageToken?: string } | null;
    for (const m of data?.models ?? []) {
      if (!m.name || !m.supportedGenerationMethods?.includes("generateContent")) continue;
      names.push(m.name.replace(/^models\//, ""));
    }
    pageToken = data?.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return names;
}

export async function resolveModel(key: string): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.model;
  const preferred = process.env.GEMINI_MODEL?.trim() || undefined;
  const available = await listModels(key);
  let model: string;
  if (available === null) {
    model = preferred ?? LAST_RESORT;
    console.warn(`ZtudyLock: could not list Gemini models; falling back to "${model}".`);
  } else {
    const picked = pickModel(available, preferred);
    if (preferred && picked !== preferred) console.warn(`ZtudyLock: GEMINI_MODEL="${preferred}" is not available; using "${picked ?? LAST_RESORT}".`);
    model = picked ?? preferred ?? LAST_RESORT;
  }
  cache = { model, at: Date.now() };
  console.info(`ZtudyLock: using Gemini model "${model}".`);
  return model;
}
