"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildPlan, currentConcept, minutesToday, streak } from "@/lib/learning/plan";
import { conceptMastery, weakConcepts } from "@/lib/learning/mastery";
import { useWorkspace } from "@/lib/store";
import { cx, daysUntil, firstName, greeting, plural } from "@/lib/utils";
import { IconArrowRight, IconCheck, LinkButton, Meter } from "@/components/ui";
import { Section } from "@/components/app/Section";

const KIND_LABEL = { learn: "Learn", quiz: "Quiz", flashcards: "Flashcards", revision: "Revise" } as const;

export function HomeView() {
  const state = useWorkspace();
  const { profile, subjects, concepts, attempts, sessions } = state;

  const plan = useMemo(() => buildPlan(state), [state]);
  const current = useMemo(() => currentConcept(concepts, attempts, sessions), [concepts, attempts, sessions]);
  const weak = useMemo(() => weakConcepts(concepts, attempts).slice(0, 3), [concepts, attempts]);
  const done = minutesToday(sessions);
  const planned = plan.reduce((s, i) => s + i.minutes, 0) || profile?.dailyMinutes || 0;
  const days = profile?.examDate ? daysUntil(profile.examDate) : null;
  const run = streak(sessions);
  const subjectOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? "";
  const name = profile ? firstName(profile.name) : "";

  return (
    <div>
      {/* Greeting */}
      <section className="grid gap-8 pb-14 md:grid-cols-12 md:pb-20">
        <div className="md:col-span-8">
          <p className="label animate-rise">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            {days !== null && days >= 0 && <span className="text-ink-2"> · {days === 0 ? "Exam today" : `${plural(days, "day")} to your exam`}</span>}
            {run > 1 && <span className="text-ink-2"> · {run}-day streak</span>}
          </p>
          <h1 className="display mt-5 animate-rise text-[44px] text-ink md:text-[72px]" style={{ "--i": 1 } as React.CSSProperties}>
            {greeting()}{name ? `, ${name}` : ""}.
          </h1>
          <p className="mt-4 animate-rise text-[17px] text-ink-3 md:text-[20px]" style={{ "--i": 2 } as React.CSSProperties}>
            {concepts.length === 0
              ? "Add some material and ZtudyLock will plan your day around it."
              : done >= planned
                ? `You've done ${plural(done, "minute")} today. That's the plan covered.`
                : done > 0
                  ? `${plural(done, "minute")} done. ${planned - done} to go on today's plan.`
                  : `You have ${plural(planned, "minute")} planned today.`}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
            {current ? (
              <LinkButton href={`/learn/${current.id}`} variant="primary" size="lg">
                Continue learning <IconArrowRight size={16} />
              </LinkButton>
            ) : (
              <LinkButton href="/library" variant="primary" size="lg">
                Add material <IconArrowRight size={16} />
              </LinkButton>
            )}
            {current && <Link href="/practice" className="link-underline text-[14px] text-ink-3 hover:text-ink">Or practise</Link>}
          </div>
        </div>
      </section>

      {concepts.length > 0 && (
        <div className="grid gap-14 md:grid-cols-12 md:gap-x-12">
          <div className="flex flex-col gap-14 md:col-span-7">
            {current && (
              <Section label="Currently learning" className="animate-rise" aside={<Link href={`/library/${current.subjectId}`} className="link-underline hover:text-ink">{subjectOf(current.subjectId)}</Link>}>
                <Link href={`/learn/${current.id}`} className="group block">
                  <p className="text-[13.5px] text-ink-3">{subjectOf(current.subjectId)}</p>
                  <p className="display mt-1 text-[30px] text-ink md:text-[40px]">{current.name}</p>
                  <MasteryLine conceptId={current.id} />
                </Link>
              </Section>
            )}

            {weak.length > 0 && (
              <Section label="Needs attention" className="animate-rise" aside="We found a few areas worth revisiting.">
                <ul className="flex flex-col">
                  {weak.map(({ concept, mastery }) => (
                    <li key={concept.id} className="flex items-center justify-between gap-6 border-b border-line py-4 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-[17px] text-ink">{concept.name}</p>
                        <p className="mono mt-1 text-[11px] text-ink-3">{subjectOf(concept.subjectId)} · {mastery.score}% mastery</p>
                      </div>
                      <Link href={`/practice/revision?concept=${concept.id}`} className="bracket shrink-0 text-[13px] text-ink-2 hover:text-ink">
                        <span className="bracket-l" aria-hidden="true">[</span>Review<span className="bracket-r" aria-hidden="true">]</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <aside className="md:col-span-5">
            <Section label="Today" className="animate-rise" aside={`${done} / ${planned} min`}>
              {plan.length === 0 ? (
                <p className="text-[14px] text-ink-3">Nothing to plan yet.</p>
              ) : (
                <ul className="flex flex-col">
                  {plan.map((item) => (
                    <li key={item.kind + item.conceptId} className={cx("border-b border-line last:border-b-0", item.done && "opacity-50")}>
                      <Link href={item.href} className="group flex items-baseline gap-4 py-3.5">
                        <span className="mono w-14 shrink-0 text-[12px] text-ink-3">{item.minutes} min</span>
                        <span className="w-24 shrink-0 text-[14px] text-ink-2">{KIND_LABEL[item.kind]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] text-ink">{item.title}</span>
                          <span className="block truncate text-[12px] text-ink-4">{item.reason}</span>
                        </span>
                        {item.done ? <IconCheck size={14} className="text-accent" /> : <IconArrowRight size={14} className="text-ink-4 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-ink" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Meter value={planned ? Math.min(100, (done / planned) * 100) : 0} tone="quiet" className="mt-5" label="Today's progress" />
            </Section>
          </aside>
        </div>
      )}
    </div>
  );
}

function MasteryLine({ conceptId }: { conceptId: string }) {
  const { attempts } = useWorkspace();
  const m = conceptMastery(conceptId, attempts);
  return (
    <div className="mt-5 flex items-center gap-4">
      <Meter value={m.score} className="max-w-sm" tone={m.status === "weak" ? "warn" : "accent"} label="Mastery" />
      <span className="mono text-[12px] text-ink-3">{m.score === null ? "not yet tested" : `${m.score}%`}</span>
    </div>
  );
}
