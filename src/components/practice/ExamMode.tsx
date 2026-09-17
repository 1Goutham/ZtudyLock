"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ai } from "@/lib/ai/client";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import type { Subject } from "@/lib/types";
import { formatRelative, normaliseName, plural } from "@/lib/utils";
import { Button, Chip, ChipGroup, LinkButton, Meter, ThinkingDots } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";

/** Characters of each paper sent for analysis; the route caps the total. */
const PAPER_CHARS = 12_000;

export function ExamMode({ initialSubjectId }: { initialSubjectId: string | null }) {
  const { subjects, documents, concepts, examInsights } = useWorkspace();
  const { saveExamInsight } = useWorkspaceActions();
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId ?? subjects[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const papers = useMemo(() => documents.filter((d) => d.subjectId === subjectId && d.kind === "question-paper"), [documents, subjectId]);
  const insight = examInsights.find((e) => e.subjectId === subjectId) ?? null;
  const stale = insight ? papers.some((p) => !insight.docIds.includes(p.id)) : false;

  const analyse = async (s: Subject) => {
    setBusy(true);
    const res = await ai.exam({
      subject: s.name,
      papers: papers.slice(0, 4).map((p) => ({ name: p.name, text: p.chunks.map((c) => c.text).join("\n\n").slice(0, PAPER_CHARS) })),
      concepts: concepts.filter((c) => c.subjectId === s.id).map((c) => c.name).slice(0, 80),
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error.message);
    const own = concepts.filter((c) => c.subjectId === s.id);
    saveExamInsight({
      subjectId: s.id,
      docIds: papers.map((p) => p.id),
      topics: res.data.topics.map((t) => ({ name: t.name, mentions: t.mentions, marks: t.marks, conceptId: t.matchedConcept ? own.find((c) => normaliseName(c.name) === normaliseName(t.matchedConcept!))?.id ?? null : null })),
      patterns: res.data.patterns,
      marksDistribution: res.data.marksDistribution,
      summary: res.data.summary,
    });
    toast.success("Papers analysed.");
  };

  const maxMentions = insight ? Math.max(1, ...insight.topics.map((t) => t.mentions)) : 1;
  const totalMarks = insight ? insight.marksDistribution.reduce((s, d) => s + d.marks, 0) : 0;

  return (
    <div>
      <nav className="mb-6 animate-fade" aria-label="Breadcrumb">
        <Link href="/practice" className="bracket text-[12.5px] text-ink-3 hover:text-ink"><span className="bracket-l" aria-hidden="true">[</span>Practice<span className="bracket-r" aria-hidden="true">]</span></Link>
      </nav>
      <PageHeader
        index="Exam mode"
        title="What your papers ask."
        description="Upload previous question papers and ZtudyLock reads them for the topics that keep appearing, how questions are phrased and where the marks sit. Then it builds a mock test to match."
        actions={
          subject && papers.length > 0 && (
            <Button variant={insight && !stale ? "secondary" : "primary"} size="sm" loading={busy} onClick={() => analyse(subject)}>
              {insight ? (stale ? "Re-analyse with new papers" : "Analyse again") : "Analyse papers"}
            </Button>
          )
        }
      />

      {subjects.length > 1 && (
        <ChipGroup className="mb-10">
          {subjects.map((s) => (
            <Chip key={s.id} size="sm" selected={subjectId === s.id} onClick={() => setSubjectId(s.id)}>{s.name}</Chip>
          ))}
        </ChipGroup>
      )}

      {!subject ? (
        <EmptyState title="No subjects yet." action={<LinkButton href="/library" variant="primary">Go to Library</LinkButton>} />
      ) : papers.length === 0 ? (
        <EmptyState
          title="No question papers yet."
          description={`Upload past papers to ${subject.name} and mark them as "Question paper". Scanned papers work as images, one page at a time.`}
          action={<LinkButton href={`/library/${subject.id}?upload=1`} variant="primary">Upload a paper</LinkButton>}
        />
      ) : busy ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center animate-fade">
          <ThinkingDots className="text-ink-3" />
          <p className="mt-5 text-[15px] text-ink-2">Reading {plural(papers.length, "paper")}</p>
        </div>
      ) : !insight ? (
        <EmptyState
          title={`${plural(papers.length, "paper")} ready.`}
          description="Analyse them to see frequently appearing topics, question patterns and marks distribution. Nothing here is a prediction; it is what these papers actually contain."
          action={<Button variant="primary" onClick={() => analyse(subject)}>Analyse papers</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-14 md:grid-cols-12 md:gap-x-12">
          <div className="flex flex-col gap-14 md:col-span-7">
            <div className="animate-rise">
              <p className="max-w-xl text-[19px] leading-snug text-ink md:text-[22px]">{insight.summary}</p>
              <p className="mono mt-3 text-[11px] text-ink-4">Based on {plural(insight.docIds.length, "paper")} · analysed {formatRelative(insight.analysedAt)}{stale ? " · new papers since" : ""}</p>
            </div>

            <Section label="Frequently appearing topics in your uploaded papers" aside="Mentions">
              <ul className="flex flex-col gap-4">
                {insight.topics.slice(0, 14).map((t) => (
                  <li key={t.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[14.5px]">
                      {t.conceptId ? <Link href={`/learn/${t.conceptId}`} className="link-underline min-w-0 truncate text-ink">{t.name}</Link> : <span className="min-w-0 truncate text-ink-2">{t.name}</span>}
                      <span className="mono shrink-0 text-[11.5px] text-ink-3">{t.mentions}×{t.marks !== null ? ` · ${t.marks} marks` : ""}</span>
                    </div>
                    <Meter value={(t.mentions / maxMentions) * 100} tone="quiet" label={`${t.name} frequency`} />
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[12.5px] text-ink-3">Topics linked to a concept in your library open the tutor. Others aren&apos;t in your material yet.</p>
            </Section>
          </div>

          <aside className="flex flex-col gap-12 md:col-span-5">
            <Section label="Question patterns">
              <ul className="flex flex-col gap-3">
                {insight.patterns.map((p, i) => (
                  <li key={i} className="flex gap-4 text-[14px] leading-relaxed text-ink-2">
                    <span className="mono shrink-0 text-[11px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Section>

            {insight.marksDistribution.length > 0 && (
              <Section label="Marks distribution" aside={`${totalMarks} marks`}>
                <ul className="flex flex-col gap-3">
                  {insight.marksDistribution.map((d) => (
                    <li key={d.label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-[13.5px]">
                        <span className="text-ink-2">{d.label}</span>
                        <span className="mono text-[11px] text-ink-3">{d.marks}</span>
                      </div>
                      <Meter value={totalMarks ? (d.marks / totalMarks) * 100 : 0} tone="quiet" label={`${d.label} marks`} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="glass-panel relative overflow-hidden p-7">
              <div className="light-orb -right-16 -top-16 size-56" aria-hidden="true" />
              <p className="label">Mock test</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Ten questions weighted toward the topics these papers ask about most, drawn from your material. Explanations at the end.</p>
              <LinkButton href={`/practice/mock?subject=${subject.id}&exam=1`} variant="primary" className="mt-5">Generate mock test</LinkButton>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
