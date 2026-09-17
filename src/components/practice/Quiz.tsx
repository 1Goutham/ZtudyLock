"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiError } from "@/lib/ai/contracts";
import { usePractice } from "@/lib/hooks/usePractice";
import { useSessionTimer } from "@/lib/hooks/useSessionTimer";
import { conceptMastery } from "@/lib/learning/mastery";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import type { Concept, PracticeMode, Question } from "@/lib/types";
import { cx, plural, shuffle } from "@/lib/utils";
import { Button, LinkButton, Meter, TextAction, ThinkingDots } from "@/components/ui";
import { FocusBar } from "./FocusBar";

/**
 * The practice experience. One question at a time, an answer, a short
 * explanation, then the next. In "mock" mode explanations wait until the end.
 * Every answer is recorded as an Attempt, which is what mastery is built from.
 */

export interface QuizResult {
  correct: number;
  total: number;
}

interface QuizProps {
  /** Concepts to draw questions from; one for a quiz, several for a mock. */
  concepts: Concept[];
  mode: PracticeMode;
  count: number;
  title?: string;
  exitHref?: string;
  targeted?: boolean;
  /** Called at the end; when provided, the summary offers "Continue" instead of the defaults. */
  onComplete?: (result: QuizResult) => void;
  continueLabel?: string;
}

type Phase = "loading" | "error" | "asking" | "answered" | "done";

const LETTERS = ["A", "B", "C", "D"];

export function Quiz({ concepts, mode, count, title, exitHref = "/practice", targeted, onComplete, continueLabel }: QuizProps) {
  const { attempts } = useWorkspace();
  const { recordAttempt } = useWorkspaceActions();
  const { ensureQuestions } = usePractice();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<AiError | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ q: Question; picked: number }[]>([]);
  const before = useRef<Map<string, number | null>>(new Map());
  const started = useRef(false);
  const primary = concepts[0];
  useSessionTimer(mode === "revision" ? "revision" : mode === "mock" ? "mock" : "quiz", primary?.subjectId ?? null, concepts.length === 1 ? primary.id : null, phase !== "loading");

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    for (const c of concepts) before.current.set(c.id, conceptMastery(c.id, attempts).score);
    const perConcept = Math.max(1, Math.ceil(count / concepts.length));
    const all: Question[] = [];
    let lastError: AiError | null = null;
    for (const c of concepts) {
      const res = await ensureQuestions(c, perConcept, { targeted, difficulty: mode === "mock" ? "mixed" : undefined });
      if (res.ok) all.push(...res.questions);
      else lastError = res.error;
      if (all.length >= count) break;
    }
    if (!all.length) {
      setError(lastError ?? { code: "empty", message: "Couldn't write questions for this concept.", retryable: true });
      setPhase("error");
      return;
    }
    setQueue((concepts.length > 1 ? shuffle(all) : all).slice(0, count));
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setPhase("asking");
  }, [concepts, count, ensureQuestions, targeted, mode, attempts]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const q = queue[index];
  const options = useMemo(() => (q ? shuffle(q.options.map((text, i) => ({ text, i })), hashSeed(q.id)) : []), [q]);

  const answer = (optionIndex: number) => {
    if (!q || phase !== "asking") return;
    const correct = optionIndex === q.answerIndex;
    setPicked(optionIndex);
    setAnswers((a) => [...a, { q, picked: optionIndex }]);
    recordAttempt({ subjectId: q.subjectId, conceptId: q.conceptId, mode, correct, questionId: q.id, prompt: q.prompt });
    setPhase("answered");
  };

  const next = () => {
    if (index + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setPhase("asking");
  };

  // Keyboard: 1–4 / A–D to answer, Enter or Space to continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (phase === "asking") {
        const n = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
        if (n >= 0 && n < options.length) answer(options[n].i);
      } else if (phase === "answered" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const correctCount = answers.filter((a) => a.picked === a.q.answerIndex).length;
  const heading = title ?? (concepts.length === 1 ? primary.name : "Mock test");

  if (phase === "loading") {
    return (
      <div>
        <FocusBar title={heading} meta="" progress={0} exitHref={exitHref} />
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center animate-fade">
          <ThinkingDots className="text-ink-3" />
          <p className="mt-5 text-[15px] text-ink-2">{targeted ? "Writing questions around what you got wrong" : mode === "mock" ? "Assembling your test" : "Writing questions from your material"}</p>
          <p className="mt-1 text-[12.5px] text-ink-4">Cached questions come back instantly; new ones take a few seconds.</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div>
        <FocusBar title={heading} meta="" progress={0} exitHref={exitHref} />
        <div className="mx-auto max-w-md py-16 text-center animate-fade">
          <p className="display text-[28px] text-ink">Couldn&apos;t start this.</p>
          <p className="mt-3 text-[14px] text-ink-3">{error?.message}</p>
          <div className="mt-8 flex justify-center gap-4">
            {error?.retryable && <Button variant="primary" onClick={load}>Try again</Button>}
            <LinkButton href={exitHref}>Back</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div>
        <FocusBar title={heading} meta={`${queue.length} / ${queue.length}`} progress={100} exitHref={exitHref} />
        <Summary answers={answers} concepts={concepts} before={before.current} mode={mode} exitHref={exitHref} onRetry={load} onComplete={onComplete ? () => onComplete({ correct: correctCount, total: answers.length }) : undefined} continueLabel={continueLabel} />
      </div>
    );
  }

  const correct = picked !== null && picked === q.answerIndex;
  const showExplanation = phase === "answered" && mode !== "mock";

  return (
    <div>
      <FocusBar title={heading} meta={`${index + 1} / ${queue.length}`} progress={((index + (phase === "answered" ? 1 : 0)) / queue.length) * 100} exitHref={exitHref} />
      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <p className="label mb-4">{concepts.length > 1 ? concepts.find((c) => c.id === q.conceptId)?.name : q.difficulty}</p>
            <h2 className="display-light text-[24px] text-ink md:text-[32px]">{q.prompt}</h2>

            <ul className="mt-10 flex flex-col gap-2" role="listbox" aria-label="Options">
              {options.map(({ text, i }, n) => {
                const isPicked = picked === i;
                const isAnswer = i === q.answerIndex;
                const reveal = phase === "answered" && mode !== "mock";
                return (
                  <li key={i}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isPicked}
                      disabled={phase !== "asking"}
                      onClick={() => answer(i)}
                      className={cx(
                        "press glass glass-hover flex w-full items-start gap-4 rounded-[18px] px-4 py-3.5 text-left",
                        phase === "asking" && "hover:text-ink",
                        reveal && isAnswer && "border-accent/60 bg-accent/8",
                        reveal && isPicked && !isAnswer && "border-danger/50 bg-danger/8",
                        reveal && !isPicked && !isAnswer && "border-line opacity-50",
                        !reveal && phase === "answered" && (isPicked ? "border-ink bg-white/6" : "border-line opacity-50"),
                      )}
                    >
                      <span className={cx("mono mt-0.5 w-5 shrink-0 text-[12px]", reveal && isAnswer ? "text-accent" : "text-ink-3")}>{LETTERS[n]}</span>
                      <span className="text-[15.5px] leading-relaxed text-ink">{text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <AnimatePresence>
              {phase === "answered" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="glass-panel mt-8 p-6 md:p-7">
                  {showExplanation ? (
                    <>
                      <p className={cx("display text-[24px]", correct ? "text-ink" : "text-ink")}>{correct ? "Correct." : "Not quite."}</p>
                      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{q.explanation}</p>
                    </>
                  ) : (
                    <p className="text-[14px] text-ink-3">Answer recorded. Explanations come at the end.</p>
                  )}
                  <div className="mt-6 flex items-center justify-between">
                    <span className="mono text-[11px] text-ink-4">Enter to continue</span>
                    <Button variant="primary" onClick={next}>{index + 1 >= queue.length ? "See results" : "Next question"}</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Summary({ answers, concepts, before, mode, exitHref, onRetry, onComplete, continueLabel }: { answers: { q: Question; picked: number }[]; concepts: Concept[]; before: Map<string, number | null>; mode: PracticeMode; exitHref: string; onRetry: () => void; onComplete?: () => void; continueLabel?: string }) {
  const { attempts } = useWorkspace();
  const correct = answers.filter((a) => a.picked === a.q.answerIndex).length;
  const [review, setReview] = useState(mode === "mock");
  const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const wrong = answers.filter((a) => a.picked !== a.q.answerIndex);

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <p className="label">{mode === "mock" ? "Test complete" : mode === "revision" ? "Reassessment" : "Quiz complete"}</p>
      <p className="display mt-4 text-[48px] text-ink md:text-[72px]">{correct} of {answers.length}</p>
      <p className="mt-2 text-[16px] text-ink-3">
        {pct >= 80 ? "That's holding well." : pct >= 50 ? "Getting there. A few ideas still need attention." : "This one needs another pass. That's what the next step is for."}
      </p>

      <ul className="mt-10 flex flex-col gap-5">
        {concepts.map((c) => {
          const now = conceptMastery(c.id, attempts);
          const prev = before.get(c.id) ?? null;
          if (concepts.length > 1 && !answers.some((a) => a.q.conceptId === c.id)) return null;
          return (
            <li key={c.id}>
              <div className="mb-2 flex items-baseline justify-between text-[14px]">
                <Link href={`/learn/${c.id}`} className="link-underline text-ink">{c.name}</Link>
                <span className="mono text-[12px] text-ink-3">
                  {prev !== null && now.score !== null && prev !== now.score ? `${prev}% → ${now.score}%` : now.score === null ? "—" : `${now.score}%`}
                </span>
              </div>
              <Meter value={now.score} tone={now.status === "weak" ? "warn" : "accent"} label={`${c.name} mastery`} />
            </li>
          );
        })}
      </ul>

      {wrong.length > 0 && (
        <div className="mt-10 border-t border-line pt-5">
          <TextAction onClick={() => setReview(!review)} aria-expanded={review}>{review ? "Hide review" : `Review ${plural(wrong.length, "miss", "misses")}`}</TextAction>
          {review && (
            <ol className="mt-5 flex flex-col gap-6 animate-fade">
              {(mode === "mock" ? answers : wrong).map(({ q, picked }) => (
                <li key={q.id} className="border-l border-line pl-4">
                  <p className="text-[15px] text-ink">{q.prompt}</p>
                  <p className={cx("mono mt-1.5 text-[11px]", picked === q.answerIndex ? "text-accent" : "text-danger")}>
                    {picked === q.answerIndex ? "Correct" : `You chose: ${q.options[picked]}`}
                  </p>
                  {picked !== q.answerIndex && <p className="mono text-[11px] text-ink-3">Answer: {q.options[q.answerIndex]}</p>}
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{q.explanation}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        {onComplete ? (
          <Button variant="primary" size="lg" onClick={onComplete}>{continueLabel ?? "Continue"}</Button>
        ) : (
          <>
            <Button variant="primary" size="lg" onClick={onRetry}>{mode === "mock" ? "New test" : "Another round"}</Button>
            {concepts.length === 1 && <LinkButton href={`/learn/${concepts[0].id}`} size="lg">Learn again</LinkButton>}
            <Link href={exitHref} className="link-underline ml-auto text-[14px] text-ink-3 hover:text-ink">Done</Link>
          </>
        )}
      </div>
    </div>
  );
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}
