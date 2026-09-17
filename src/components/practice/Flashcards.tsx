"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiError } from "@/lib/ai/contracts";
import { FLASHCARD_BATCH } from "@/lib/constants";
import { usePractice } from "@/lib/hooks/usePractice";
import { useSessionTimer } from "@/lib/hooks/useSessionTimer";
import { newSchedule, previewIntervals } from "@/lib/learning/scheduler";
import { dueCards } from "@/lib/learning/plan";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import type { CardRating, Concept, Flashcard } from "@/lib/types";
import { cx, plural } from "@/lib/utils";
import { Button, LinkButton, ThinkingDots } from "@/components/ui";
import { FocusBar } from "./FocusBar";

/**
 * Tactile flashcards. One large card, tap or space to flip, four ratings
 * that feed SM-2 scheduling. On touch, drag left for Again and right for Good.
 */

const RATINGS: { key: CardRating; label: string; k: string }[] = [
  { key: "again", label: "Again", k: "1" },
  { key: "hard", label: "Hard", k: "2" },
  { key: "good", label: "Good", k: "3" },
  { key: "easy", label: "Easy", k: "4" },
];

export function Flashcards({ concept, dueOnly }: { concept: Concept | null; dueOnly?: boolean }) {
  const { flashcards, schedules, concepts } = useWorkspace();
  const { rateCard, recordAttempt } = useWorkspaceActions();
  const { ensureFlashcards } = usePractice();
  const [phase, setPhase] = useState<"loading" | "error" | "study" | "done">("loading");
  const [error, setError] = useState<AiError | null>(null);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Record<CardRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const started = useRef(false);
  useSessionTimer("flashcards", concept?.subjectId ?? null, concept?.id ?? null, phase === "study");

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    let cards: Flashcard[];
    if (concept) {
      const res = await ensureFlashcards(concept, FLASHCARD_BATCH);
      if (!res.ok) {
        setError(res.error);
        setPhase("error");
        return;
      }
      cards = dueOnly ? dueCards(res.cards, schedules) : res.cards;
      if (!cards.length) cards = res.cards; // nothing due: let them review anyway
    } else {
      cards = dueCards(flashcards, schedules);
    }
    if (!cards.length) {
      setQueue([]);
      setPhase("done");
      return;
    }
    setQueue(cards.slice(0, 30));
    setI(0);
    setFlipped(false);
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
    setPhase("study");
  }, [concept, dueOnly, ensureFlashcards, flashcards, schedules]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const card = queue[i];
  const schedule = useMemo(() => (card ? schedules.find((s) => s.cardId === card.id) ?? newSchedule(card.id) : null), [card, schedules]);
  const intervals = useMemo(() => (schedule ? previewIntervals(schedule) : null), [schedule]);

  const rate = useCallback(
    (rating: CardRating) => {
      if (!card || phase !== "study") return;
      rateCard(card.id, rating);
      recordAttempt({ subjectId: card.subjectId, conceptId: card.conceptId, mode: "flashcards", correct: rating !== "again", rating, prompt: card.front });
      setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
      // "Again" comes back later in this session.
      setQueue((q) => (rating === "again" ? [...q, card] : q));
      if (i + 1 >= queue.length + (rating === "again" ? 1 : 0)) setPhase("done");
      else {
        setI(i + 1);
        setFlipped(false);
      }
    },
    [card, phase, rateCard, recordAttempt, i, queue.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "study") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      const r = RATINGS.find((x) => x.k === e.key);
      if (r && flipped) rate(r.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flipped, rate]);

  const title = concept ? concept.name : "Cards due";
  const conceptName = (id: string) => concepts.find((c) => c.id === id)?.name ?? "";

  if (phase === "loading") {
    return (
      <div>
        <FocusBar title={title} meta="" progress={0} />
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center animate-fade">
          <ThinkingDots className="text-ink-3" />
          <p className="mt-5 text-[15px] text-ink-2">{concept && !flashcards.some((c) => c.conceptId === concept.id) ? "Writing cards from your material" : "Shuffling your cards"}</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div>
        <FocusBar title={title} meta="" progress={0} />
        <div className="mx-auto max-w-md py-16 text-center animate-fade">
          <p className="display text-[28px] text-ink">Couldn&apos;t make cards.</p>
          <p className="mt-3 text-[14px] text-ink-3">{error?.message}</p>
          <div className="mt-8 flex justify-center gap-4">
            {error?.retryable && <Button variant="primary" onClick={load}>Try again</Button>}
            <LinkButton href="/practice">Back</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    return (
      <div>
        <FocusBar title={title} meta="" progress={100} />
        <div className="mx-auto max-w-xl animate-rise">
          <p className="label">{total ? "Session complete" : "Nothing due"}</p>
          <p className="display mt-4 text-[40px] text-ink md:text-[56px]">{total ? `${plural(total, "card")} reviewed.` : "You're up to date."}</p>
          {total > 0 && (
            <ul className="mt-8 grid grid-cols-4 gap-3 border-t border-line pt-5">
              {RATINGS.map((r) => (
                <li key={r.key}>
                  <p className="mono text-[11px] text-ink-3">{r.label}</p>
                  <p className="display mt-1 text-[24px] text-ink">{tally[r.key]}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-[14px] text-ink-3">{total ? "Cards you marked Again come back sooner; Easy ones wait longer. Come back tomorrow and Home will tell you what's due." : "Cards come due on a schedule. Learn a concept and generate cards for it, or check back tomorrow."}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            {concept && <Button variant="primary" size="lg" onClick={load}>Go again</Button>}
            {concept && <LinkButton href={`/practice/quiz?concept=${concept.id}`} size="lg">Test me</LinkButton>}
            <Link href="/practice" className="link-underline ml-auto self-center text-[14px] text-ink-3 hover:text-ink">Done</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FocusBar title={title} meta={`${i + 1} / ${queue.length}`} progress={(i / queue.length) * 100} />
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <div className="relative h-[360px] w-full overflow-x-clip sm:h-[400px]" style={{ perspective: 1400 }}>
          <div className="light-orb -left-16 -top-20 size-72" aria-hidden="true" />
          <div className="light-orb -bottom-24 -right-10 size-64 opacity-60" aria-hidden="true" />
          <AnimatePresence mode="popLayout">
            <Card key={`${card.id}-${i}`} card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} onSwipe={(dir) => flipped && rate(dir === "left" ? "again" : "good")} subtitle={!concept ? conceptName(card.conceptId) : undefined} />
          </AnimatePresence>
        </div>

        <div className={cx("mt-8 w-full transition-opacity duration-300", flipped ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!flipped}>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button key={r.key} type="button" onClick={() => rate(r.key)} className={cx("press glass flex flex-col items-center rounded-[16px] py-3 text-ink hover:border-white/20", r.key === "again" && "hover:text-danger", r.key === "easy" && "hover:text-accent")}>
                <span className="text-[14px]">{r.label}</span>
                <span className="mono mt-1 text-[10.5px] text-ink-3">{intervals?.[r.key]}</span>
              </button>
            ))}
          </div>
          <p className="mono mt-3 text-center text-[11px] text-ink-4">1–4 to rate · space to flip · drag left for Again, right for Good</p>
        </div>
        {!flipped && <p className="mono mt-8 text-[11px] text-ink-4">Tap the card or press space to reveal</p>}
      </div>
    </div>
  );
}

function Card({ card, flipped, onFlip, onSwipe, subtitle }: { card: Flashcard; flipped: boolean; onFlip: () => void; onSwipe: (dir: "left" | "right") => void; subtitle?: string }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const opacity = useTransform(x, [-220, 0, 220], [0.4, 1, 0.4]);
  return (
    <motion.button
      type="button"
      aria-pressed={flipped}
      aria-label={flipped ? "Card back" : "Card front. Activate to reveal."}
      onClick={onFlip}
      drag={flipped ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x < -110) onSwipe("left");
        else if (info.offset.x > 110) onSwipe("right");
      }}
      style={{ x, rotate, opacity, transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateY: flipped ? 180 : 0 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="absolute inset-0 w-full cursor-pointer rounded-[28px] text-left focus-visible:outline-none"
    >
      <Face subtitle={subtitle} label="Question" text={card.front} />
      <Face subtitle={subtitle} label="Answer" text={card.back} back />
    </motion.button>
  );
}

function Face({ label, text, back, subtitle }: { label: string; text: string; back?: boolean; subtitle?: string }) {
  return (
    <div className="card-3d absolute inset-0 flex flex-col rounded-[28px] p-7 sm:p-9" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined }}>
      <div className="flex items-baseline justify-between">
        <p className="label">{label}</p>
        {subtitle && <p className="mono truncate pl-4 text-[11px] text-ink-4">{subtitle}</p>}
      </div>
      <p className={cx("mt-auto text-ink", back ? "text-[18px] leading-relaxed sm:text-[21px]" : "display-light text-[26px] sm:text-[32px]")}>{text}</p>
      <p className="mt-auto pt-6 text-[11.5px] text-ink-4">{back ? "How well did you know it?" : "Think of the answer, then reveal."}</p>
    </div>
  );
}
