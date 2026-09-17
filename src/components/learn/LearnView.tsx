"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionTimer } from "@/lib/hooks/useSessionTimer";
import { conceptMastery, statusLabel } from "@/lib/learning/mastery";
import { currentConcept, nextConcept } from "@/lib/learning/plan";
import { useWorkspace } from "@/lib/store";
import { cx, plural } from "@/lib/utils";
import { Chip, ChipGroup, IconArrowRight, LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";
import { Tutor } from "./Tutor";

export function LearnView() {
  const { subjects, concepts, attempts, sessions, documents } = useWorkspace();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const subject = subjects.find((s) => s.id === (subjectId ?? subjects[0]?.id)) ?? null;
  const current = useMemo(() => currentConcept(concepts, attempts, sessions), [concepts, attempts, sessions]);
  const next = useMemo(() => nextConcept(concepts, attempts, subject?.id), [concepts, attempts, subject]);
  const list = useMemo(() => concepts.filter((c) => !subject || c.subjectId === subject.id), [concepts, subject]);
  const hasDocs = documents.some((d) => !subject || d.subjectId === subject.id);
  useSessionTimer("ask", subject?.id ?? null, null, concepts.length > 0);

  if (concepts.length === 0) {
    return (
      <div>
        <PageHeader index="Learn" title="Nothing to learn from yet." description="Upload material in the Library and ZtudyLock turns it into concepts you can learn one at a time." />
        <EmptyState title="Start with your material." action={<LinkButton href="/library" variant="primary">Go to Library</LinkButton>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        index="Learn"
        title={current ? "Continue learning." : "Pick a concept."}
        description="One concept at a time, with a tutor that knows your material, your mastery and your mistakes."
        actions={
          current && (
            <LinkButton href={`/learn/${current.id}`} variant="primary" size="md">
              {current.name} <IconArrowRight size={14} />
            </LinkButton>
          )
        }
      />

      {subjects.length > 1 && (
        <ChipGroup className="mb-10">
          {subjects.map((s) => (
            <Chip key={s.id} size="sm" selected={subject?.id === s.id} onClick={() => setSubjectId(s.id)}>{s.name}</Chip>
          ))}
        </ChipGroup>
      )}

      <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-x-12">
        <div className="md:col-span-5">
          <Section label={subject ? subject.name : "Concepts"} aside={plural(list.length, "concept")}>
            <ul className="border-t border-line">
              {list.map((c) => {
                const m = conceptMastery(c.id, attempts);
                const isNext = next?.id === c.id;
                return (
                  <li key={c.id} className="border-b border-line">
                    <Link href={`/learn/${c.id}`} className="group flex items-center justify-between gap-4 py-3.5">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={cx("size-1.5 shrink-0 rounded-full", m.status === "strong" ? "bg-accent" : m.status === "weak" ? "bg-warn" : m.status === "untested" ? "bg-ink-4" : "bg-ink-2")} aria-hidden="true" />
                        <span className="truncate text-[15px] text-ink">{c.name}</span>
                        {isNext && <span className="label hidden text-[9.5px] text-accent sm:inline">next</span>}
                      </span>
                      <span className="mono shrink-0 text-[11px] text-ink-3">{m.score === null ? statusLabel(m.status) : `${m.score}%`}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="md:col-span-7 md:border-l md:border-line md:pl-12">
          <p className="label mb-6">Ask your material{subject ? ` · ${subject.name}` : ""}</p>
          {hasDocs ? (
            <Tutor subject={subject} concept={null} placeholder={`Ask anything about your ${subject?.name ?? ""} material.`} className="min-h-[50vh]" />
          ) : (
            <p className="text-[14px] text-ink-3">No documents in this subject yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
