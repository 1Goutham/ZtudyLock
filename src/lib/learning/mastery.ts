import type { Attempt, CardRating, Concept } from "../types";

/**
 * Mastery is computed, never stored. Every answered question and every rated
 * card is an `Attempt`; from those we derive a recency-weighted score per
 * concept, a status, and the list of concepts that need another pass.
 */

export type MasteryStatus = "untested" | "learning" | "weak" | "developing" | "strong";

export interface ConceptMastery {
  conceptId: string;
  /** 0–100, or null when the concept has never been tested. */
  score: number | null;
  attempts: number;
  status: MasteryStatus;
  lastAt: string | null;
  /** Positive when recent attempts are better than earlier ones. */
  trend: number;
  consecutiveMisses: number;
}

const DECAY = 0.82;
const MIN_ATTEMPTS = 3;

function value(a: Attempt): number {
  if (a.rating) {
    const map: Record<CardRating, number> = { again: 0, hard: 0.45, good: 0.9, easy: 1 };
    return map[a.rating];
  }
  return a.correct ? 1 : 0;
}

export function statusFor(score: number | null, attempts: number, consecutiveMisses: number): MasteryStatus {
  if (score === null || attempts === 0) return "untested";
  if (consecutiveMisses >= 2 && attempts >= 2) return "weak";
  if (attempts < MIN_ATTEMPTS) return "learning";
  if (score < 50) return "weak";
  if (score < 80) return "developing";
  return "strong";
}

export function conceptMastery(conceptId: string, attempts: Attempt[]): ConceptMastery {
  const list = attempts.filter((a) => a.conceptId === conceptId).sort((a, b) => (a.at < b.at ? 1 : -1));
  if (!list.length) return { conceptId, score: null, attempts: 0, status: "untested", lastAt: null, trend: 0, consecutiveMisses: 0 };

  let num = 0;
  let den = 0;
  list.forEach((a, i) => {
    const w = Math.pow(DECAY, i);
    num += w * value(a);
    den += w;
  });
  const score = Math.round((100 * num) / den);

  let consecutiveMisses = 0;
  for (const a of list) {
    if (value(a) < 0.5) consecutiveMisses++;
    else break;
  }

  const recent = list.slice(0, 5);
  const earlier = list.slice(5, 10);
  const avg = (xs: Attempt[]) => (xs.length ? xs.reduce((s, a) => s + value(a), 0) / xs.length : null);
  const r = avg(recent);
  const e = avg(earlier);
  const trend = r !== null && e !== null ? Math.round((r - e) * 100) : 0;

  return { conceptId, score, attempts: list.length, status: statusFor(score, list.length, consecutiveMisses), lastAt: list[0].at, trend, consecutiveMisses };
}

export function masteryMap(concepts: Concept[], attempts: Attempt[]): Map<string, ConceptMastery> {
  const map = new Map<string, ConceptMastery>();
  for (const c of concepts) map.set(c.id, conceptMastery(c.id, attempts));
  return map;
}

export interface SubjectMastery {
  subjectId: string;
  /** Mean of tested concepts, or null when nothing has been tested. */
  score: number | null;
  tested: number;
  total: number;
  weak: ConceptMastery[];
  strong: ConceptMastery[];
}

export function subjectMastery(subjectId: string, concepts: Concept[], attempts: Attempt[]): SubjectMastery {
  const own = concepts.filter((c) => c.subjectId === subjectId);
  const ms = own.map((c) => conceptMastery(c.id, attempts));
  const tested = ms.filter((m) => m.score !== null);
  const score = tested.length ? Math.round(tested.reduce((s, m) => s + (m.score ?? 0), 0) / tested.length) : null;
  return {
    subjectId,
    score,
    tested: tested.length,
    total: own.length,
    weak: ms.filter((m) => m.status === "weak").sort((a, b) => (a.score ?? 0) - (b.score ?? 0)),
    strong: ms.filter((m) => m.status === "strong").sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
  };
}

/** Concepts that need another pass, weakest first, across all subjects. */
export function weakConcepts(concepts: Concept[], attempts: Attempt[]): { concept: Concept; mastery: ConceptMastery }[] {
  return concepts
    .map((concept) => ({ concept, mastery: conceptMastery(concept.id, attempts) }))
    .filter((x) => x.mastery.status === "weak")
    .sort((a, b) => (a.mastery.score ?? 0) - (b.mastery.score ?? 0));
}

/** Recent missed prompts for a concept, for the tutor's context. */
export function recentMistakes(conceptId: string, attempts: Attempt[], limit = 3): string[] {
  return attempts
    .filter((a) => a.conceptId === conceptId && !a.correct && a.prompt)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
    .map((a) => a.prompt as string);
}

export function statusLabel(status: MasteryStatus): string {
  switch (status) {
    case "untested":
      return "Not yet tested";
    case "learning":
      return "Getting started";
    case "weak":
      return "Needs another pass";
    case "developing":
      return "Developing";
    case "strong":
      return "Strong";
  }
}
