"use client";

import { useCallback } from "react";
import { ai, buildBrief, toPassagePayload } from "../ai/client";
import type { AiError } from "../ai/contracts";
import { retrieve } from "../learning/retrieval";
import { useWorkspace, useWorkspaceActions } from "../store";
import type { Concept, Difficulty, Flashcard, Question } from "../types";
import { shuffle } from "../utils";

/**
 * Question and flashcard supply. Cached items are reused first; the model is
 * only asked for what is missing, and told what already exists so it doesn't
 * repeat itself. Each generation carries a compact brief and a few passages.
 */

const RECENT_DAYS = 3;

export type PracticeError = AiError;

export function usePractice() {
  const { profile, subjects, documents, attempts, questions, flashcards } = useWorkspace();
  const { cacheQuestions, cacheFlashcards } = useWorkspaceActions();

  const passagesFor = useCallback(
    (concept: Concept) => {
      const docs = documents.filter((d) => d.subjectId === concept.subjectId);
      return toPassagePayload(retrieve(docs, `${concept.name} ${concept.summary}`, { limit: 4, charBudget: 5_000, preferChunkIds: concept.sourceChunkIds }));
    },
    [documents],
  );

  /** Up to `count` questions for a concept; generates the shortfall. */
  const ensureQuestions = useCallback(
    async (concept: Concept, count: number, opts: { difficulty?: Difficulty | "mixed"; targeted?: boolean; signal?: AbortSignal } = {}): Promise<{ ok: true; questions: Question[] } | { ok: false; error: PracticeError }> => {
      const subject = subjects.find((s) => s.id === concept.subjectId) ?? null;
      const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
      const recentlyRight = new Set(attempts.filter((a) => a.conceptId === concept.id && a.correct && a.questionId && new Date(a.at).getTime() > cutoff).map((a) => a.questionId));
      const cached = questions.filter((q) => q.conceptId === concept.id);
      let pool = cached.filter((q) => !recentlyRight.has(q.id));
      if (opts.targeted) pool = []; // a revision pass always gets fresh, targeted questions

      if (pool.length < count) {
        const need = Math.max(3, count - pool.length);
        const res = await ai.practice(
          { brief: buildBrief(profile, subject, concept, attempts), count: need, difficulty: opts.difficulty ?? "mixed", passages: passagesFor(concept), avoid: cached.map((q) => q.prompt).slice(-30), targeted: !!opts.targeted },
          opts.signal,
        );
        if (!res.ok) {
          if (pool.length) return { ok: true, questions: shuffle(pool).slice(0, count) };
          return { ok: false, error: res.error };
        }
        const fresh = cacheQuestions(res.data.questions.map((q) => ({ ...q, subjectId: concept.subjectId, conceptId: concept.id })));
        pool = [...fresh, ...pool];
      }
      return { ok: true, questions: shuffle(pool).slice(0, count) };
    },
    [subjects, attempts, questions, profile, passagesFor, cacheQuestions],
  );

  /** All cards for a concept, generating a first batch when there are none. */
  const ensureFlashcards = useCallback(
    async (concept: Concept, count: number, signal?: AbortSignal): Promise<{ ok: true; cards: Flashcard[] } | { ok: false; error: PracticeError }> => {
      const own = flashcards.filter((c) => c.conceptId === concept.id);
      if (own.length >= Math.min(count, 4)) return { ok: true, cards: own };
      const subject = subjects.find((s) => s.id === concept.subjectId) ?? null;
      const res = await ai.flashcards({ brief: buildBrief(profile, subject, concept, attempts), count, passages: passagesFor(concept), avoid: own.map((c) => c.front) }, signal);
      if (!res.ok) return own.length ? { ok: true, cards: own } : { ok: false, error: res.error };
      const fresh = cacheFlashcards(res.data.cards.map((c) => ({ ...c, subjectId: concept.subjectId, conceptId: concept.id })));
      return { ok: true, cards: [...own, ...fresh] };
    },
    [flashcards, subjects, profile, attempts, passagesFor, cacheFlashcards],
  );

  return { ensureQuestions, ensureFlashcards };
}
