import type { Attempt, CardSchedule, Concept, Flashcard, Profile, StudySession, Subject } from "../types";
import { DEFAULT_DAILY_MINUTES } from "../constants";
import { dayKey } from "../utils";
import { conceptMastery, weakConcepts } from "./mastery";
import { isDue } from "./scheduler";

/**
 * Today's plan is derived from state, not written by hand: what is weak, what
 * is due, what hasn't been learned yet. It re-computes as the student works.
 */

export type PlanKind = "revision" | "flashcards" | "learn" | "quiz";

export interface PlanItem {
  kind: PlanKind;
  minutes: number;
  title: string;
  reason: string;
  subjectId: string | null;
  conceptId: string | null;
  href: string;
  done: boolean;
}

interface PlanInput {
  profile: Profile | null;
  subjects: Subject[];
  concepts: Concept[];
  attempts: Attempt[];
  flashcards: Flashcard[];
  schedules: CardSchedule[];
  sessions: StudySession[];
}

export function minutesToday(sessions: StudySession[], now = new Date()): number {
  const key = dayKey(now);
  return sessions.filter((s) => dayKey(s.at) === key).reduce((sum, s) => sum + s.minutes, 0);
}

export function dueCards(flashcards: Flashcard[], schedules: CardSchedule[], now = new Date()): Flashcard[] {
  const byCard = new Map(schedules.map((s) => [s.cardId, s]));
  return flashcards.filter((c) => isDue(byCard.get(c.id), now));
}

/** The concept the student should learn next: core first, least practised, in extraction order. */
export function nextConcept(concepts: Concept[], attempts: Attempt[], subjectId?: string | null): Concept | null {
  const pool = concepts.filter((c) => !subjectId || c.subjectId === subjectId);
  if (!pool.length) return null;
  const rank = (c: Concept) => {
    const m = conceptMastery(c.id, attempts);
    const base = m.status === "untested" ? 0 : m.status === "learning" ? 1 : m.status === "weak" ? 2 : m.status === "developing" ? 3 : 4;
    return base * 10 + (c.importance === "core" ? 0 : 5);
  };
  return [...pool].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}

/** The concept most recently worked on that isn't yet strong. */
export function currentConcept(concepts: Concept[], attempts: Attempt[], sessions: StudySession[]): Concept | null {
  const recentIds = [...sessions, ...attempts.map((a) => ({ conceptId: a.conceptId, at: a.at }))]
    .filter((s) => s.conceptId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((s) => s.conceptId as string);
  for (const id of recentIds) {
    const c = concepts.find((x) => x.id === id);
    if (c && conceptMastery(c.id, attempts).status !== "strong") return c;
  }
  return nextConcept(concepts, attempts);
}

export function buildPlan(input: PlanInput, now = new Date()): PlanItem[] {
  const { profile, concepts, attempts, flashcards, schedules, sessions } = input;
  const budget = profile?.dailyMinutes ?? DEFAULT_DAILY_MINUTES;
  if (!concepts.length) return [];

  const today = dayKey(now);
  const doneKinds = new Set(sessions.filter((s) => dayKey(s.at) === today).map((s) => s.kind));
  const items: PlanItem[] = [];

  const weak = weakConcepts(concepts, attempts)[0];
  if (weak) {
    items.push({
      kind: "revision",
      minutes: 15,
      title: weak.concept.name,
      reason: `${weak.mastery.score}% mastery. A short pass will help.`,
      subjectId: weak.concept.subjectId,
      conceptId: weak.concept.id,
      href: `/practice/revision?concept=${weak.concept.id}`,
      done: doneKinds.has("revision"),
    });
  }

  const due = dueCards(flashcards, schedules, now);
  if (due.length) {
    items.push({
      kind: "flashcards",
      minutes: Math.min(15, Math.max(5, Math.round(due.length * 0.75))),
      title: `${due.length} ${due.length === 1 ? "card" : "cards"} due`,
      reason: "Spaced repetition keeps what you learned from fading.",
      subjectId: null,
      conceptId: null,
      href: "/practice/flashcards?due=1",
      done: doneKinds.has("flashcards"),
    });
  }

  const next = nextConcept(concepts, attempts);
  if (next) {
    const m = conceptMastery(next.id, attempts);
    items.push({
      kind: "learn",
      minutes: 20,
      title: next.name,
      reason: m.status === "untested" ? "New concept from your material." : "Continue where you left off.",
      subjectId: next.subjectId,
      conceptId: next.id,
      href: `/learn/${next.id}`,
      done: doneKinds.has("learn"),
    });
    items.push({
      kind: "quiz",
      minutes: 10,
      title: next.name,
      reason: "Five questions to check it stuck.",
      subjectId: next.subjectId,
      conceptId: next.id,
      href: `/practice/quiz?concept=${next.id}`,
      done: doneKinds.has("quiz"),
    });
  }

  // Scale the plan to the daily budget, keeping every block at least 5 minutes.
  const total = items.reduce((s, i) => s + i.minutes, 0);
  if (total > budget && total > 0) {
    const f = budget / total;
    for (const i of items) i.minutes = Math.max(5, Math.round(i.minutes * f));
  }
  return items;
}

/** Consecutive days (ending today or yesterday) with at least one session. */
export function streak(sessions: StudySession[], now = new Date()): number {
  const days = new Set(sessions.map((s) => dayKey(s.at)));
  let count = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
