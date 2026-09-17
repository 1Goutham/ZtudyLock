import "server-only";
import { gemini } from "./gemini";
import { createCompatibleProvider } from "./openaiCompatible";
import type { Provider, ProviderId } from "./types";

/** The provider registry. Free tiers first. `AI_PROVIDERS` (comma-separated ids) overrides the order. */

export const groq = createCompatibleProvider({
  id: "groq",
  label: "Groq",
  signupUrl: "https://console.groq.com/keys",
  baseUrl: (process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  apiKey: () => process.env.GROQ_API_KEY,
  model: () => process.env.GROQ_MODEL?.trim() || undefined,
  defaultModels: ["llama-3.3-70b-versatile", "meta-llama/llama-4-maverick-17b-128e-instruct", "openai/gpt-oss-120b", "llama-3.1-8b-instant"],
  supportsJsonMode: true,
  note: "Free tier, no card. Very fast; a good fallback when Gemini is rate-limited.",
});

export const openrouter = createCompatibleProvider({
  id: "openrouter",
  label: "OpenRouter",
  signupUrl: "https://openrouter.ai/keys",
  baseUrl: (process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  apiKey: () => process.env.OPENROUTER_API_KEY,
  model: () => process.env.OPENROUTER_MODEL?.trim() || undefined,
  defaultModels: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free", "qwen/qwen3-235b-a22b:free"],
  supportsJsonMode: false,
  extraHeaders: { "HTTP-Referer": "https://ztudylock.vercel.app", "X-Title": "ZtudyLock" },
  note: "Many free community models. Quality and uptime vary by model.",
});

export const custom = createCompatibleProvider({
  id: "custom",
  label: process.env.AI_LABEL?.trim() || "Custom endpoint",
  signupUrl: "",
  baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
  apiKey: () => (process.env.AI_BASE_URL ? process.env.AI_API_KEY || "none" : undefined),
  model: () => process.env.AI_MODEL?.trim() || undefined,
  defaultModels: [],
  supportsJsonMode: process.env.AI_JSON_MODE !== "0",
  note: "Any OpenAI-compatible endpoint: Cerebras, Mistral, Together, a local Ollama.",
});

const ALL: Record<ProviderId, Provider> = { gemini, groq, openrouter, custom };
const DEFAULT_ORDER: ProviderId[] = ["gemini", "groq", "openrouter", "custom"];

export function providerOrder(): ProviderId[] {
  const raw = process.env.AI_PROVIDERS?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) as ProviderId[] | undefined;
  const ids = raw?.filter((id) => id in ALL);
  return ids?.length ? ids : DEFAULT_ORDER;
}

export function allProviders(): Provider[] {
  return providerOrder().map((id) => ALL[id]);
}

export function activeProviders(): Provider[] {
  return allProviders().filter((p) => p.configured());
}
