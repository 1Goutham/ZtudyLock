"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionTimer } from "@/lib/hooks/useSessionTimer";
import { conceptMastery, statusLabel } from "@/lib/learning/mastery";
import { useWorkspace } from "@/lib/store";
import { cx, normaliseName } from "@/lib/utils";
import { LinkButton, Meter, TextAction } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { Tutor } from "./Tutor";

export function ConceptView({ conceptId }: { conceptId: string }) {
  const { subjects, concepts, documents, attempts } = useWorkspace();
  const concept = concepts.find((c) => c.id === conceptId) ?? null;
  const subject = concept ? subjects.find((s) => s.id === concept.subjectId) ?? null : null;
  const mastery = useMemo(() => conceptMastery(conceptId, attempts), [conceptId, attempts]);
  const [showSources, setShowSources] = useState(false);
  useSessionTimer("learn", subject?.id ?? null, concept?.id ?? null, !!concept);

  const sources = useMemo(() => {
    if (!concept) return [];
    const out: { doc: string; heading: string | null; text: string }[] = [];
    for (const d of documents) {
      for (const ch of d.chunks) if (concept.sourceChunkIds.includes(ch.id)) out.push({ doc: d.name, heading: ch.heading, text: ch.text });
    }
    return out.slice(0, 3);
  }, [concept, documents]);

  const related = useMemo(() => {
    if (!concept) return [];
    const own = concepts.filter((c) => c.subjectId === concept.subjectId && c.id !== concept.id);
    return concept.related
      .map((name) => own.find((c) => normaliseName(c.name) === normaliseName(name)) ?? { id: null, name })
      .slice(0, 6);
  }, [concept, concepts]);

  if (!concept || !subject) {
    return <EmptyState title="Concept not found." description="It may have been removed with its document." action={<LinkButton href="/learn" variant="primary">Back to Learn</LinkButton>} />;
  }

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-x-12">
      {/* Concept */}
      <div className="md:col-span-4">
        <nav className="mb-6 flex items-center gap-2 text-[12.5px] text-ink-3 animate-fade" aria-label="Breadcrumb">
          <Link href="/learn" className="link-underline hover:text-ink">Learn</Link>
          <span className="text-ink-4">/</span>
          <Link href={`/library/${subject.id}`} className="link-underline hover:text-ink">{subject.name}</Link>
        </nav>
        {concept.chapter && <p className="label mb-3 animate-rise">{concept.chapter}</p>}
        <h1 className="display animate-rise text-[36px] text-ink md:text-[44px]" style={{ "--i": 1 } as React.CSSProperties}>{concept.name}</h1>
        <p className="mt-5 animate-rise text-[15px] leading-relaxed text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>{concept.summary}</p>
        {concept.definition && (
          <blockquote className="mt-6 border-l border-line-2 pl-4 animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="label mb-1.5">Definition, from your material</p>
            <p className="text-[14px] leading-relaxed text-ink-2">{concept.definition}</p>
          </blockquote>
        )}

        <div className="glass-panel mt-8 animate-rise p-5" style={{ "--i": 4 } as React.CSSProperties}>
          <div className="flex items-baseline justify-between">
            <p className="label">Mastery</p>
            <p className="mono text-[11px] text-ink-3">{mastery.score === null ? statusLabel(mastery.status) : `${mastery.score}% · ${statusLabel(mastery.status)}`}</p>
          </div>
          <Meter value={mastery.score} tone={mastery.status === "weak" ? "warn" : "accent"} className="mt-2.5" label="Mastery" />
          {mastery.status === "weak" && (
            <p className="mt-3 text-[13px] text-ink-3">
              This one may need another pass.{" "}
              <Link href={`/practice/revision?concept=${concept.id}`} className="link-underline text-ink">Start a revision pass</Link>
            </p>
          )}
        </div>

        {related.length > 0 && (
          <div className="mt-8 animate-rise" style={{ "--i": 5 } as React.CSSProperties}>
            <p className="label mb-3">Related</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
              {related.map((r) =>
                r.id ? (
                  <li key={r.id}><Link href={`/learn/${r.id}`} className="link-underline text-ink-2 hover:text-ink">{r.name}</Link></li>
                ) : (
                  <li key={r.name} className="text-ink-4">{r.name}</li>
                ),
              )}
            </ul>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-8 animate-rise" style={{ "--i": 6 } as React.CSSProperties}>
            <TextAction onClick={() => setShowSources(!showSources)} aria-expanded={showSources}>{showSources ? "Hide sources" : "From your material"}</TextAction>
            <div className={cx("grid transition-[grid-template-rows] duration-300", showSources ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <ul className="mt-4 flex flex-col gap-4">
                  {sources.map((s, i) => (
                    <li key={i} className="border-l border-line pl-4">
                      <p className="mono text-[10.5px] text-ink-4">{s.doc}{s.heading ? ` › ${s.heading}` : ""}</p>
                      <p className="mt-1 line-clamp-6 text-[13px] leading-relaxed text-ink-3">{s.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3 animate-rise" style={{ "--i": 7 } as React.CSSProperties}>
          <LinkButton href={`/practice/quiz?concept=${concept.id}`} size="sm" variant="primary">Test me</LinkButton>
          <LinkButton href={`/practice/flashcards?concept=${concept.id}`} size="sm">Flashcards</LinkButton>
        </div>
      </div>

      {/* Tutor */}
      <div className="md:col-span-8 md:border-l md:border-line md:pl-12">
        <Tutor subject={subject} concept={concept} className="min-h-[70vh]" />
      </div>
    </div>
  );
}
