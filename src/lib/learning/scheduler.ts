import type { CardRating, CardSchedule } from "../types";
import { nowIso } from "../utils";

/**
 * SM-2 spaced repetition. `Again` resets the card and brings it back within
 * the session; `Hard`, `Good`, `Easy` grow the interval with the card's ease.
 */

const QUALITY: Record<CardRating, number> = { again: 0, hard: 3, good: 4, easy: 5 };
const AGAIN_MINUTES = 10;

export function newSchedule(cardId: string): CardSchedule {
  return { cardId, ease: 2.5, intervalDays: 0, due: nowIso(), reps: 0, lapses: 0, lastRating: null };
}

export function rate(prev: CardSchedule, rating: CardRating, now = new Date()): CardSchedule {
  const q = QUALITY[rating];
  let { ease, intervalDays, reps, lapses } = prev;

  if (q < 3) {
    reps = 0;
    lapses += 1;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { ...prev, ease, intervalDays, reps, lapses, lastRating: rating, due: new Date(now.getTime() + AGAIN_MINUTES * 60_000).toISOString() };
  }

  if (reps === 0) intervalDays = 1;
  else if (reps === 1) intervalDays = 6;
  else intervalDays = Math.round(intervalDays * ease);
  if (rating === "hard") intervalDays = Math.max(1, Math.round(intervalDays * 0.6));
  if (rating === "easy") intervalDays = Math.round(intervalDays * 1.3);
  reps += 1;
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays);
  return { ...prev, ease, intervalDays, reps, lapses, lastRating: rating, due: due.toISOString() };
}

export function isDue(s: CardSchedule | undefined, now = new Date()): boolean {
  return !s || new Date(s.due).getTime() <= now.getTime();
}

/** Human description of the next interval for each rating; shown under the buttons. */
export function previewIntervals(prev: CardSchedule): Record<CardRating, string> {
  const fmt = (s: CardSchedule) => {
    if (s.intervalDays === 0) return `${AGAIN_MINUTES} min`;
    if (s.intervalDays === 1) return "1 day";
    if (s.intervalDays < 30) return `${s.intervalDays} days`;
    const months = Math.round(s.intervalDays / 30);
    return months === 1 ? "1 month" : `${months} months`;
  };
  return {
    again: fmt(rate(prev, "again")),
    hard: fmt(rate(prev, "hard")),
    good: fmt(rate(prev, "good")),
    easy: fmt(rate(prev, "easy")),
  };
}
