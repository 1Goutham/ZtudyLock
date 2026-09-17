"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ai, buildBrief, toPassagePayload } from "@/lib/ai/client";
import type { AiError } from "@/lib/ai/contracts";
import { useSessionTimer } from "@/lib/hooks/useSessionTimer";
import { conceptMastery } from "@/lib/learning/mastery";
import { retrieve } from "@/lib/learning/retrieval";
import { useWorkspace } from "@/lib/store";
import type { Concept, TutorIntent } from "@/lib/types";
import { cx } from "@/lib/utils";
import { Button, LinkButton, Markdown, Meter, ThinkingDots } from "@/components/ui";
import { FocusBar } from "./FocusBar";
import { Quiz } from "./Quiz";

/**
 * The adaptive loop's answer to a weak concept. Four short steps:
 * a simple explanation, a worked example, five targeted questions, then a
 * reassessment against the mastery score the student walked in with.
 */

const STEPS = ["Simple explanation", "Worked example", "Targeted questions", "Reassessment"] as const;

export function RevisionPass({ concept }: { concept: Concept }) {
  const { profile, subjects, documents, attempts } = useWorkspace();
  const subject = subjects.find((s) => s.id === concept.subjectId) ?? null;
  const [step, setStep] = useState(0);
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiError | null>(null);
  const before = useRef<number | null>(conceptMastery(concept.id, attempts).score);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const mastery = conceptMastery(concept.id, attempts);
  useSessionTimer("revision", concept.subjectId, concept.id, step < 2);

  const explain = useCallback(
    async (index: 0 | 1) => {
      setBusy(true);
      setError(null);
      const intent: TutorIntent = index === 0 ? "simple" : "example";
      const docs = documents.filter((d) => d.subjectId === concept.subjectId);
      const passages = toPassagePayload(retrieve(docs, `${concept.name} ${concept.summary}`, { limit: 4, charBudget: 5_000, preferChunkIds: concept.sourceChunkIds }));
      const res = await ai.tutor({
        brief: buildBrief(profile, subject, concept, attempts),
        intent,
        message: index === 0 ? `Explain ${concept.name} simply, as a fresh start. I keep getting it wrong.` : `Now walk me through one concrete worked example of ${concept.name}, step by step.`,
        history: index === 1 && texts[0] ? [{ role: "tutor", content: texts[0] }] : [],
        passages,
      });
      setBusy(false);
      if (!res.ok) return setError(res.error);
      setTexts((t) => ({ ...t, [index]: res.data.reply }));
    },
    [concept, documents, profile, subject, attempts, texts],
  );

  useEffect(() => {
    if (step < 2 && !texts[step] && !busy && !error) void explain(step as 0 | 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === 2) {
    return (
      <Quiz
        concepts={[concept]}
        mode="revision"
        count={5}
        targeted
        title={`Revision pass · ${concept.name}`}
        exitHref={`/learn/${concept.id}`}
        continueLabel="See reassessment"
        onComplete={(r) => {
          setResult(r);
          setStep(3);
        }}
      />
    );
  }

  return (
    <div>
      <FocusBar title={`Revision pass · ${concept.name}`} meta={`${step + 1} / ${STEPS.length}`} progress={(step / (STEPS.length - 1)) * 100} exitHref={`/learn/${concept.id}`} />
      <div className="mx-auto max-w-2xl">
        <ol className="mb-10 flex flex-wrap gap-x-6 gap-y-1">
          {STEPS.map((s, i) => (
            <li key={s} className={cx("mono text-[11px] uppercase tracking-[0.14em] transition-colors", i === step ? "text-ink" : i < step ? "text-ink-3" : "text-ink-4")}>
              {String(i + 1).padStart(2, "0")} {s}
            </li>
          ))}
        </ol>

        {step < 2 && (
          <div className="animate-rise">
            <p className="label mb-4">{STEPS[step]}</p>
            {busy ? (
              <div className="flex items-center gap-3 py-10 text-[14px] text-ink-3">
                <ThinkingDots className="text-ink-3" /> {step === 0 ? "Explaining from the start" : "Working through an example"}
              </div>
            ) : error ? (
              <div className="py-6">
                <p className="text-[14px] text-danger">{error.message}</p>
                <Button className="mt-4" variant="primary" size="sm" onClick={() => explain(step as 0 | 1)}>Try again</Button>
              </div>
            ) : (
              <Markdown>{texts[step] ?? ""}</Markdown>
            )}
            <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
              <Link href={`/learn/${concept.id}`} className="link-underline text-[13.5px] text-ink-3 hover:text-ink">Open the tutor instead</Link>
              <Button variant="primary" disabled={busy || !texts[step]} onClick={() => setStep(step + 1)}>{step === 0 ? "Show me an example" : "Test me on it"}</Button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="animate-rise">
            <p className="label">Reassessment</p>
            <p className="display mt-4 text-[44px] text-ink md:text-[64px]">
              {before.current === null ? `${mastery.score ?? 0}%` : `${before.current}% → ${mastery.score ?? 0}%`}
            </p>
            <Meter value={mastery.score} tone={mastery.status === "weak" ? "warn" : "accent"} className="mt-4 max-w-md" label="Mastery" />
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-2">
              {mastery.status === "weak"
                ? `${result.correct} of ${result.total} this time. ${concept.name} still needs work. Another pass tomorrow will land better than one now; the tutor can also try a different angle.`
                : mastery.status === "strong"
                  ? `${result.correct} of ${result.total}. ${concept.name} is holding. It will come back in flashcards so it stays that way.`
                  : `${result.correct} of ${result.total}. Better. One more round in a day or two should make it stick.`}
            </p>
            <div className="mt-10 flex flex-wrap gap-4 border-t border-line pt-6">
              {mastery.status === "weak" ? <LinkButton href={`/learn/${concept.id}`} variant="primary" size="lg">Try a different angle</LinkButton> : <LinkButton href="/home" variant="primary" size="lg">Back to today</LinkButton>}
              <LinkButton href={`/practice/flashcards?concept=${concept.id}`} size="lg">Flashcards</LinkButton>
              <Link href="/progress" className="link-underline ml-auto self-center text-[14px] text-ink-3 hover:text-ink">See progress</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
