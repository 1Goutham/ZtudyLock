"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { conceptMastery, weakConcepts } from "@/lib/learning/mastery";
import { currentConcept, dueCards } from "@/lib/learning/plan";
import { useWorkspace } from "@/lib/store";
import { cx, plural } from "@/lib/utils";
import { Chip, ChipGroup, IconArrowRight, LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";

export function PracticeHub() {
  const { subjects, concepts, attempts, sessions, flashcards, schedules, documents } = useWorkspace();
  const current = useMemo(() => currentConcept(concepts, attempts, sessions), [concepts, attempts, sessions]);
  const [subjectId, setSubjectId] = useState<string | null>(current?.subjectId ?? subjects[0]?.id ?? null);
  const [conceptId, setConceptId] = useState<string | null>(current?.id ?? null);
  const list = useMemo(() => concepts.filter((c) => c.subjectId === subjectId), [concepts, subjectId]);
  const chosen = list.find((c) => c.id === conceptId) ?? list[0] ?? null;
  const due = dueCards(flashcards, schedules).length;
  const weak = weakConcepts(concepts, attempts);
  const papers = documents.filter((d) => d.kind === "question-paper").length;

  if (concepts.length === 0) {
    return (
      <div>
        <PageHeader index="Practice" title="Nothing to practise yet." description="Practice is built from your material. Upload something first." />
        <EmptyState title="Start with your material." action={<LinkButton href="/library" variant="primary">Go to Library</LinkButton>} />
      </div>
    );
  }

  const modes = [
    { href: chosen ? `/practice/quiz?concept=${chosen.id}` : "#", title: "Quiz", body: "Five questions on one concept. An explanation after every answer.", meta: chosen ? chosen.name : "Pick a concept" },
    { href: chosen ? `/practice/flashcards?concept=${chosen.id}` : "#", title: "Flashcards", body: "Tactile cards with spaced repetition. Again, Hard, Good, Easy.", meta: due ? `${plural(due, "card")} due` : chosen ? chosen.name : "" },
    { href: weak[0] ? `/practice/revision?concept=${weak[0].concept.id}` : "#", title: "Revision pass", body: "Simple explanation, worked example, five targeted questions, reassessment.", meta: weak.length ? `${plural(weak.length, "weak area")}` : "Nothing weak right now", disabled: !weak.length },
    { href: subjectId ? `/practice/mock?subject=${subjectId}` : "#", title: "Mock test", body: "Ten questions across a subject, explanations at the end.", meta: subjects.find((s) => s.id === subjectId)?.name ?? "" },
    { href: subjectId ? `/practice/exam?subject=${subjectId}` : "/practice/exam", title: "Exam mode", body: "Analyse past papers for repeated topics, patterns and marks. Then a matching mock.", meta: papers ? `${plural(papers, "paper")} uploaded` : "Upload past papers" },
  ];

  return (
    <div>
      <PageHeader index="Practice" title="Test what you know." description="Every answer feeds your mastery. Weak areas get spotted and get their own pass." />

      <div className="grid gap-14 md:grid-cols-12 md:gap-x-12">
        <div className="md:col-span-7">
          <ul className="border-t border-line">
            {modes.map((m, i) => (
              <li key={m.title} className="border-b border-line animate-rise" style={{ "--i": i + 1 } as React.CSSProperties}>
                <Link href={m.href} aria-disabled={m.disabled} className={cx("group flex items-center justify-between gap-6 py-6", m.disabled && "pointer-events-none opacity-50")}>
                  <span className="min-w-0">
                    <span className="block text-[22px] text-ink md:text-[26px]">{m.title}</span>
                    <span className="mt-1 block max-w-md text-[13.5px] leading-relaxed text-ink-3">{m.body}</span>
                    {m.meta && <span className="mono mt-2 block text-[11px] text-ink-4">{m.meta}</span>}
                  </span>
                  <IconArrowRight size={18} className="shrink-0 text-ink-4 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <aside className="md:col-span-5">
          <Section label="Practise on" aside={chosen ? `${conceptMastery(chosen.id, attempts).score ?? "—"}${conceptMastery(chosen.id, attempts).score !== null ? "%" : ""}` : ""}>
            {subjects.length > 1 && (
              <ChipGroup className="mb-5">
                {subjects.map((s) => (
                  <Chip key={s.id} size="sm" selected={subjectId === s.id} onClick={() => { setSubjectId(s.id); setConceptId(null); }}>{s.name}</Chip>
                ))}
              </ChipGroup>
            )}
            <ul className="max-h-[420px] overflow-y-auto border-t border-line no-scrollbar">
              {list.map((c) => {
                const m = conceptMastery(c.id, attempts);
                const active = chosen?.id === c.id;
                return (
                  <li key={c.id} className="border-b border-line">
                    <button type="button" onClick={() => setConceptId(c.id)} aria-pressed={active} className="flex w-full items-center justify-between gap-4 py-3 text-left">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={cx("size-1.5 shrink-0 rounded-full transition-colors", active ? "bg-accent" : "bg-ink-4")} aria-hidden="true" />
                        <span className={cx("truncate text-[14.5px] transition-colors", active ? "text-ink" : "text-ink-2")}>{c.name}</span>
                      </span>
                      <span className="mono shrink-0 text-[11px] text-ink-3">{m.score === null ? "—" : `${m.score}%`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </aside>
      </div>
    </div>
  );
}
