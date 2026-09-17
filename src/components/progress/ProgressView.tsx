"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { conceptMastery, statusLabel, subjectMastery } from "@/lib/learning/mastery";
import { minutesToday, streak } from "@/lib/learning/plan";
import { useWorkspace } from "@/lib/store";
import { cx, dayKey, plural } from "@/lib/utils";
import { Chip, ChipGroup, LinkButton, Meter } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";

export function ProgressView() {
  const { subjects, concepts, attempts, sessions } = useWorkspace();
  const [subjectId, setSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  const sm = useMemo(() => (subject ? subjectMastery(subject.id, concepts, attempts) : null), [subject, concepts, attempts]);
  const rows = useMemo(() => {
    if (!subject) return [];
    return concepts
      .filter((c) => c.subjectId === subject.id)
      .map((c) => ({ c, m: conceptMastery(c.id, attempts) }))
      .sort((a, b) => (b.m.score ?? -1) - (a.m.score ?? -1));
  }, [subject, concepts, attempts]);
  const strongest = rows.find((r) => r.m.status === "strong") ?? null;
  const weakest = [...rows].reverse().find((r) => r.m.status === "weak") ?? null;

  const history = useMemo(() => {
    const days: { key: string; label: string; minutes: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), minutes: sessions.filter((s) => dayKey(s.at) === key).reduce((sum, s) => sum + s.minutes, 0) });
    }
    return days;
  }, [sessions]);
  const maxMin = Math.max(1, ...history.map((h) => h.minutes));
  const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
  const weekAttempts = attempts.filter((a) => Date.now() - new Date(a.at).getTime() < 7 * 86_400_000);
  const accuracy = weekAttempts.length ? Math.round((weekAttempts.filter((a) => a.correct).length / weekAttempts.length) * 100) : null;
  const run = streak(sessions);

  if (concepts.length === 0) {
    return (
      <div>
        <PageHeader index="Progress" title="Nothing to measure yet." description="Progress is built from real attempts. Learn a concept, take a quiz, and this page fills in." />
        <EmptyState title="Start with your material." action={<LinkButton href="/library" variant="primary">Go to Library</LinkButton>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        index="Progress"
        title="Your progress"
        description={
          attempts.length === 0
            ? "No attempts yet. Every quiz answer and flashcard rating feeds this page."
            : strongest && weakest
              ? `Your strongest area is ${strongest.c.name}. ${weakest.c.name} needs another pass.`
              : strongest
                ? `Your strongest area is ${strongest.c.name}.`
                : weakest
                  ? `${weakest.c.name} needs another pass.`
                  : "Keep going. A few more attempts and patterns will show."
        }
      />

      {subjects.length > 1 && (
        <ChipGroup className="mb-10">
          {subjects.map((s) => (
            <Chip key={s.id} size="sm" selected={subjectId === s.id} onClick={() => setSubjectId(s.id)}>{s.name}</Chip>
          ))}
        </ChipGroup>
      )}

      <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-x-12">
        <div className="md:col-span-7">
          {subject && sm && (
            <>
              <div className="mb-10 animate-rise">
                <p className="text-[13.5px] text-ink-3">{subject.name}</p>
                <p className="display mt-1 text-[56px] text-ink md:text-[80px]">{sm.score === null ? "—" : `${sm.score}%`}</p>
                <Meter value={sm.score} tone={sm.score !== null && sm.score < 50 ? "warn" : "accent"} className="mt-3 max-w-md" label="Subject mastery" />
                <p className="mono mt-3 text-[11px] text-ink-4">{sm.tested} of {sm.total} concepts tested</p>
              </div>
              <Section label="Concept mastery" aside={plural(rows.length, "concept")}>
                <ul className="flex flex-col gap-4">
                  {rows.map(({ c, m }, i) => (
                    <li key={c.id} className="animate-rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[14.5px]">
                        <Link href={`/learn/${c.id}`} className="link-underline min-w-0 truncate text-ink">{c.name}</Link>
                        <span className={cx("mono shrink-0 text-[11.5px]", m.status === "weak" ? "text-warn" : "text-ink-3")}>
                          {m.score === null ? statusLabel(m.status) : `${m.score}%`}
                          {m.trend !== 0 && m.attempts >= 6 && <span className="text-ink-4"> {m.trend > 0 ? "↑" : "↓"}</span>}
                        </span>
                      </div>
                      <Meter value={m.score} tone={m.status === "weak" ? "warn" : m.status === "strong" ? "accent" : "quiet"} label={`${c.name} mastery`} />
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-12 md:col-span-5">
          <Section label="Last 14 days" className="glass-panel p-6" aside={`${plural(minutesToday(sessions), "min")} today`}>
            <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Minutes studied per day over the last two weeks">
              {history.map((h) => (
                <div key={h.key} className="flex flex-1 flex-col items-center gap-1.5" title={`${h.minutes} min`}>
                  <div className="w-full rounded-full bg-ink-2/80 transition-[height] duration-700 ease-[var(--ease-out-expo)]" style={{ height: `${Math.max(2, (h.minutes / maxMin) * 72)}px`, opacity: h.minutes ? 1 : 0.2 }} />
                  <span className="mono text-[9px] text-ink-4">{h.label}</span>
                </div>
              ))}
            </div>
            <ul className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
              <Stat label="Streak" value={run ? `${run}d` : "—"} />
              <Stat label="Accuracy · 7d" value={accuracy === null ? "—" : `${accuracy}%`} />
              <Stat label="Total time" value={totalMin < 60 ? `${totalMin}m` : `${Math.round(totalMin / 60)}h`} />
            </ul>
          </Section>

          {sm && sm.weak.length > 0 && (
            <Section label="Needs another pass">
              <ul className="flex flex-col gap-3">
                {sm.weak.slice(0, 5).map((m) => {
                  const c = concepts.find((x) => x.id === m.conceptId);
                  if (!c) return null;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px] text-ink">{c.name}</span>
                      <Link href={`/practice/revision?concept=${c.id}`} className="bracket shrink-0 text-[12px] text-ink-2 hover:text-ink"><span className="bracket-l" aria-hidden="true">[</span>Review<span className="bracket-r" aria-hidden="true">]</span></Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {sm && sm.strong.length > 0 && (
            <Section label="Holding well">
              <p className="text-[14px] leading-relaxed text-ink-2">{sm.strong.slice(0, 6).map((m) => concepts.find((c) => c.id === m.conceptId)?.name).filter(Boolean).join(" · ")}</p>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <p className="label text-[10px]">{label}</p>
      <p className="display mt-1.5 text-[22px] text-ink">{value}</p>
    </li>
  );
}
