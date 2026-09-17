import type {
  AiResponse,
  EngineStatus,
  ExamRequest,
  ExamResult,
  FlashcardsRequest,
  FlashcardsResult,
  LearningBrief,
  PassagePayload,
  PracticeRequest,
  PracticeResult,
  TranscribeRequest,
  TranscribeResult,
  TutorRequest,
  TutorResult,
  UnderstandRequest,
  UnderstandResult,
} from "./contracts";
import type { Attempt, Concept, Profile, Subject } from "../types";
import { conceptMastery, recentMistakes } from "../learning/mastery";
import type { Passage } from "../learning/retrieval";

/**
 * Browser-side client for the AI routes. Never touches the model or a key;
 * every call returns a typed `AiResponse` and never throws.
 */

async function post<TReq, TRes>(path: string, body: TReq, signal?: AbortSignal): Promise<AiResponse<TRes>> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const json = (await res.json().catch(() => null)) as AiResponse<TRes> | null;
    if (json && typeof json === "object" && "ok" in json) return json;
    return { ok: false, error: { code: "malformed", message: "ZtudyLock returned an unexpected response. Please try again.", retryable: true } };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: { code: "network", message: "Cancelled.", retryable: true } };
    return { ok: false, error: { code: "network", message: "You appear to be offline. Your work is safe; try again when you're connected.", retryable: true } };
  }
}

export const ai = {
  understand: (body: UnderstandRequest, signal?: AbortSignal) => post<UnderstandRequest, UnderstandResult>("/api/understand", body, signal),
  tutor: (body: TutorRequest, signal?: AbortSignal) => post<TutorRequest, TutorResult>("/api/tutor", body, signal),
  practice: (body: PracticeRequest, signal?: AbortSignal) => post<PracticeRequest, PracticeResult>("/api/practice", body, signal),
  flashcards: (body: FlashcardsRequest, signal?: AbortSignal) => post<FlashcardsRequest, FlashcardsResult>("/api/flashcards", body, signal),
  exam: (body: ExamRequest, signal?: AbortSignal) => post<ExamRequest, ExamResult>("/api/exam", body, signal),
  transcribe: (body: TranscribeRequest, signal?: AbortSignal) => post<TranscribeRequest, TranscribeResult>("/api/transcribe", body, signal),
  engine: async (): Promise<AiResponse<EngineStatus>> => {
    try {
      const res = await fetch("/api/engine");
      const json = (await res.json().catch(() => null)) as AiResponse<EngineStatus> | null;
      return json && "ok" in json ? json : { ok: false, error: { code: "malformed", message: "Couldn't read engine status.", retryable: true } };
    } catch {
      return { ok: false, error: { code: "network", message: "Couldn't reach ZtudyLock.", retryable: true } };
    }
  },
};

export function buildBrief(profile: Profile | null, subject: Subject | null, concept: Concept | null, attempts: Attempt[]): LearningBrief {
  const m = concept ? conceptMastery(concept.id, attempts) : null;
  return {
    student: { name: profile?.name ?? "", studying: profile?.studying ?? "", preparingFor: profile?.preparingFor ?? "", examDate: profile?.examDate ?? null },
    subject: subject?.name ?? "",
    concept: concept ? { name: concept.name, summary: concept.summary, definition: concept.definition, chapter: concept.chapter, related: concept.related } : null,
    mastery: m && m.score !== null ? { score: m.score, status: m.status, attempts: m.attempts } : null,
    recentMistakes: concept ? recentMistakes(concept.id, attempts) : [],
  };
}

export function toPassagePayload(passages: Passage[]): PassagePayload[] {
  return passages.map((p) => ({ source: p.docName, heading: p.heading, text: p.text }));
}
