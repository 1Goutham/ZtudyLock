import "server-only";
import { NextResponse } from "next/server";
import type { AiError, AiResponse, LearningBrief, PassagePayload } from "./contracts";
import { checkRateLimit, clientKey } from "./rateLimit";

/** Shared plumbing for the AI route handlers: parsing, validation, rate limiting, one envelope. */

const STATUS: Record<AiError["code"], number> = {
  not_configured: 503,
  invalid_request: 400,
  rate_limited: 429,
  timeout: 504,
  upstream: 502,
  blocked: 422,
  empty: 502,
  malformed: 502,
  network: 502,
};

export function respond<T>(result: AiResponse<T>, extraHeaders?: HeadersInit): NextResponse {
  if (result.ok) return NextResponse.json(result, { status: 200 });
  return NextResponse.json(result, { status: STATUS[result.error.code], headers: extraHeaders });
}

export function invalid(message: string): AiResponse<never> {
  return { ok: false, error: { code: "invalid_request", message, retryable: false } };
}

export async function withAiRoute<TBody, TData>(req: Request, validate: (body: unknown) => TBody | string, run: (body: TBody) => Promise<AiResponse<TData>>): Promise<NextResponse> {
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return respond(
      { ok: false, error: { code: "rate_limited", message: `That's a lot at once. Give ZtudyLock ${limit.retryAfterSec}s to catch up.`, retryable: true } },
      { "Retry-After": String(limit.retryAfterSec) },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(invalid("Request body must be JSON."));
  }
  const parsed = validate(body);
  if (typeof parsed === "string") return respond(invalid(parsed));
  try {
    return respond(await run(parsed));
  } catch (e) {
    console.error("AI route failed:", e);
    return respond({ ok: false, error: { code: "upstream", message: "Something went wrong on ZtudyLock's side. Please try again.", retryable: true } });
  }
}

/* ---------- validation helpers (small on purpose; no extra deps) ---------- */

export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const str = (v: unknown, max = 20_000): string => (typeof v === "string" ? v.slice(0, max) : "");
export const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
export const strArr = (v: unknown, max = 20, each = 300): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.slice(0, each)).slice(0, max) : []);

export function parseBrief(v: unknown): LearningBrief | null {
  if (!isObj(v) || !isObj(v.student)) return null;
  const s = v.student;
  const c = isObj(v.concept) ? v.concept : null;
  const m = isObj(v.mastery) ? v.mastery : null;
  return {
    student: { name: str(s.name, 80), studying: str(s.studying, 160), preparingFor: str(s.preparingFor, 160), examDate: typeof s.examDate === "string" ? s.examDate.slice(0, 10) : null },
    subject: str(v.subject, 120),
    concept: c
      ? { name: str(c.name, 160), summary: str(c.summary, 800), definition: typeof c.definition === "string" ? c.definition.slice(0, 500) : null, chapter: typeof c.chapter === "string" ? c.chapter.slice(0, 160) : null, related: strArr(c.related, 8, 80) }
      : null,
    mastery: m ? { score: typeof m.score === "number" ? Math.round(m.score) : null, status: str(m.status, 20), attempts: num(m.attempts, 0, 0, 10_000) } : null,
    recentMistakes: strArr(v.recentMistakes, 5, 300),
  };
}

export function parsePassages(v: unknown, maxChars = 6_000): PassagePayload[] {
  if (!Array.isArray(v)) return [];
  const out: PassagePayload[] = [];
  let used = 0;
  for (const p of v) {
    if (!isObj(p)) continue;
    const text = str(p.text, 2_500).trim();
    if (!text) continue;
    if (used + text.length > maxChars) break;
    used += text.length;
    out.push({ source: str(p.source, 160), heading: typeof p.heading === "string" ? p.heading.slice(0, 120) : null, text });
    if (out.length >= 6) break;
  }
  return out;
}
