/**
 * Shared request/response contracts between the browser and the API routes.
 * Keep this file free of server-only imports.
 */
import type { ConceptImportance, Difficulty, DocumentKind, TutorIntent } from "../types";

export type AiErrorCode = "not_configured" | "invalid_request" | "rate_limited" | "timeout" | "upstream" | "blocked" | "empty" | "malformed" | "network";

export interface AiError {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
}

export type AiResponse<T> = { ok: true; data: T } | { ok: false; error: AiError };

/**
 * The compact context every learning request carries. A few hundred
 * characters that tell the model who is learning, what, and how it is going;
 * never whole documents.
 */
export interface LearningBrief {
  student: { name: string; studying: string; preparingFor: string; examDate: string | null };
  subject: string;
  concept: { name: string; summary: string; definition: string | null; chapter: string | null; related: string[] } | null;
  mastery: { score: number | null; status: string; attempts: number } | null;
  recentMistakes: string[];
}

/** A retrieved passage, quoted with its source so answers can cite it. */
export interface PassagePayload {
  source: string;
  heading: string | null;
  text: string;
}

/* ---------- understand ---------- */
export interface UnderstandRequest {
  subject: string;
  document: { name: string; kind: DocumentKind };
  chunks: { id: string; heading: string | null; text: string }[];
  /** Concepts already known for this subject, so the model extends instead of duplicating. */
  knownConcepts: string[];
}
export interface ExtractedConcept {
  name: string;
  summary: string;
  definition: string | null;
  importance: ConceptImportance;
  chapter: string | null;
  chunkIds: string[];
  related: string[];
}
export interface UnderstandResult {
  chapters: string[];
  concepts: ExtractedConcept[];
}

/* ---------- tutor ---------- */
export interface TutorRequest {
  brief: LearningBrief;
  intent: TutorIntent | null;
  message: string;
  history: { role: "user" | "tutor"; content: string }[];
  passages: PassagePayload[];
}
export interface TutorResult {
  reply: string;
  /** A one-line check-in the UI offers after an explanation, or null. */
  checkQuestion: string | null;
}

/* ---------- practice ---------- */
export interface PracticeRequest {
  brief: LearningBrief;
  count: number;
  difficulty: Difficulty | "mixed";
  passages: PassagePayload[];
  /** Prompts already asked, so new questions don't repeat them. */
  avoid: string[];
  /** True for a revision pass: questions target the recent mistakes. */
  targeted: boolean;
}
export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
}
export interface PracticeResult {
  questions: GeneratedQuestion[];
}

/* ---------- flashcards ---------- */
export interface FlashcardsRequest {
  brief: LearningBrief;
  count: number;
  passages: PassagePayload[];
  avoid: string[];
}
export interface GeneratedCard {
  front: string;
  back: string;
}
export interface FlashcardsResult {
  cards: GeneratedCard[];
}

/* ---------- exam analysis ---------- */
export interface ExamRequest {
  subject: string;
  papers: { name: string; text: string }[];
  concepts: string[];
}
export interface ExamResult {
  topics: { name: string; mentions: number; marks: number | null; matchedConcept: string | null }[];
  patterns: string[];
  marksDistribution: { label: string; marks: number }[];
  summary: string;
}

/* ---------- transcribe (one image) ---------- */
export interface TranscribeRequest {
  /** Base64 without the data-URL prefix. */
  image: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
}
export interface TranscribeResult {
  text: string;
}

/* ---------- engine status ---------- */
export interface EngineStatus {
  providers: { id: string; label: string; signupUrl: string; configured: boolean; model: string | null; note?: string }[];
  active: string[];
}
