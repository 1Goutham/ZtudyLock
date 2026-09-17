"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { conceptMastery, statusLabel, subjectMastery } from "@/lib/learning/mastery";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import type { Concept, StudyDocument } from "@/lib/types";
import { cx, formatRelative, plural } from "@/lib/utils";
import { Button, IconArrowRight, Input, LinkButton, Meter, Sheet, TextAction } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";
import { UploadFlow } from "./UploadFlow";
import { RerunFlow } from "./RerunFlow";

export function SubjectView({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { subjects, documents, concepts, attempts, sessions, examInsights } = useWorkspace();
  const { renameSubject, removeSubject, removeDocument, removeConcepts } = useWorkspaceActions();
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const [upload, setUpload] = useState(params.get("upload") === "1");
  const [retryDoc, setRetryDoc] = useState<StudyDocument | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(subject?.name ?? "");

  useEffect(() => {
    if (params.get("upload") === "1") router.replace(`/library/${subjectId}`);
  }, [params, router, subjectId]);

  const docs = useMemo(() => documents.filter((d) => d.subjectId === subjectId), [documents, subjectId]);
  const cons = useMemo(() => concepts.filter((c) => c.subjectId === subjectId), [concepts, subjectId]);
  const mastery = useMemo(() => subjectMastery(subjectId, concepts, attempts), [subjectId, concepts, attempts]);
  const recent = useMemo(() => sessions.filter((s) => s.subjectId === subjectId).slice(-5).reverse(), [sessions, subjectId]);
  const papers = docs.filter((d) => d.kind === "question-paper");
  const insight = examInsights.find((e) => e.subjectId === subjectId) ?? null;

  const chapters = useMemo(() => {
    const groups = new Map<string, Concept[]>();
    for (const c of cons) {
      const key = c.chapter ?? "";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : 0));
  }, [cons]);

  if (!subject) {
    return <EmptyState title="Subject not found." description="It may have been removed." action={<LinkButton href="/library" variant="primary">Back to Library</LinkButton>} />;
  }

  const weakList = mastery.weak.map((m) => ({ m, c: cons.find((c) => c.id === m.conceptId)! })).filter((x) => x.c);

  return (
    <div>
      <nav className="mb-6 animate-fade" aria-label="Breadcrumb">
        <Link href="/library" className="bracket text-[12.5px] text-ink-3 hover:text-ink">
          <span className="bracket-l" aria-hidden="true">[</span>Library<span className="bracket-r" aria-hidden="true">]</span>
        </Link>
      </nav>
      <PageHeader
        title={
          renaming ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (name.trim()) { renameSubject(subject.id, name); setRenaming(false); } }}
              className="flex items-center gap-4"
            >
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="display text-[32px] md:text-[40px]" aria-label="Subject name" />
              <Button type="submit" size="sm" variant="primary">Save</Button>
            </form>
          ) : (
            subject.name
          )
        }
        description={`${plural(docs.length, "document")} · ${plural(cons.length, "concept")} · ${mastery.tested} of ${mastery.total} tested`}
        actions={
          <>
            <TextAction onClick={() => { setName(subject.name); setRenaming(!renaming); }}>{renaming ? "Cancel" : "Rename"}</TextAction>
            <Button variant="primary" size="sm" onClick={() => setUpload(true)}>+ Add material</Button>
          </>
        }
      />

      {docs.length === 0 && cons.length === 0 ? (
        <EmptyState
          title="No material yet."
          description="Upload notes, a textbook chapter, slides or past papers. ZtudyLock reads them and builds a learning map for this subject."
          action={<Button variant="primary" onClick={() => setUpload(true)}>Upload material</Button>}
        />
      ) : (
        <div className="grid gap-14 md:grid-cols-12 md:gap-x-12">
          <div className="flex flex-col gap-14 md:col-span-8">
            {/* Concepts */}
            <Section label="Learning map" aside={`${plural(cons.length, "concept")}`}>
              {cons.length === 0 ? (
                <p className="text-[14px] text-ink-3">No concepts extracted yet. {docs.some((d) => d.status === "failed") ? "One of your documents failed to process; try uploading it again." : ""}</p>
              ) : (
                <div className="flex flex-col gap-8">
                  {chapters.map(([chapter, list]) => (
                    <div key={chapter || "_"}>
                      {chapter && <p className="mb-2 text-[13px] text-ink-3">{chapter}</p>}
                      <ul className="border-t border-line">
                        {list.map((c) => {
                          const m = conceptMastery(c.id, attempts);
                          return (
                            <li key={c.id} className="border-b border-line">
                              <Link href={`/learn/${c.id}`} className="group flex items-center justify-between gap-6 py-3.5">
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className={cx("size-1.5 shrink-0 rounded-full", m.status === "strong" ? "bg-accent" : m.status === "weak" ? "bg-warn" : m.status === "untested" ? "bg-ink-4" : "bg-ink-2")} aria-hidden="true" />
                                  <span className="truncate text-[15.5px] text-ink">{c.name}</span>
                                  {c.importance === "core" && <span className="label hidden text-[9.5px] sm:inline">core</span>}
                                </span>
                                <span className="flex shrink-0 items-center gap-4">
                                  <span className="mono text-[11px] text-ink-3">{m.score === null ? statusLabel(m.status) : `${m.score}%`}</span>
                                  <IconArrowRight size={14} className="text-ink-4 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-ink" />
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Documents */}
            <Section label="Documents" aside={plural(docs.length, "file")}>
              <ul className="border-t border-line">
                {docs.map((d) => (
                  <DocumentRow key={d.id} doc={d} onRetry={() => setRetryDoc(d)} onRemove={() => {
                    const orphaned = cons.filter((c) => c.sourceDocIds.length === 1 && c.sourceDocIds[0] === d.id).map((c) => c.id);
                    removeDocument(d.id);
                    if (orphaned.length) removeConcepts(orphaned);
                    toast.message(orphaned.length ? `Document and ${plural(orphaned.length, "concept")} removed.` : "Document removed.");
                  }} />
                ))}
              </ul>
              {papers.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-[13.5px] text-ink-3">{plural(papers.length, "question paper")} in this subject{insight ? ` · analysed ${formatRelative(insight.analysedAt)}` : ""}.</p>
                  <LinkButton href={`/practice/exam?subject=${subject.id}`} size="sm">{insight ? "Open exam mode" : "Analyse papers"}</LinkButton>
                </div>
              )}
            </Section>
          </div>

          <aside className="flex flex-col gap-12 md:col-span-4">
            <Section label="Progress">
              <p className="display text-[44px] text-ink">{mastery.score === null ? "—" : `${mastery.score}%`}</p>
              <Meter value={mastery.score} tone={mastery.score !== null && mastery.score < 50 ? "warn" : "accent"} className="mt-3" label="Subject mastery" />
              <p className="mt-3 text-[13px] text-ink-3">{mastery.score === null ? "Nothing tested yet. Learn a concept, then take a quiz." : `${mastery.tested} of ${mastery.total} concepts tested.`}</p>
              {weakList.length > 0 && (
                <div className="mt-8">
                  <p className="label mb-3">Needs attention</p>
                  <ul className="flex flex-col gap-3">
                    {weakList.slice(0, 4).map(({ m, c }) => (
                      <li key={c.id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-ink">{c.name}</span>
                          <span className="mono text-[11px] text-ink-3">{m.score}% mastery</span>
                        </span>
                        <Link href={`/practice/revision?concept=${c.id}`} className="bracket shrink-0 text-[12px] text-ink-2 hover:text-ink">
                          <span className="bracket-l" aria-hidden="true">[</span>Review<span className="bracket-r" aria-hidden="true">]</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            {recent.length > 0 && (
              <Section label="Recent activity">
                <ul className="flex flex-col gap-2.5">
                  {recent.map((s) => {
                    const c = s.conceptId ? cons.find((x) => x.id === s.conceptId) : null;
                    return (
                      <li key={s.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-ink-2">
                          <span className="capitalize">{s.kind}</span>
                          {c ? <span className="text-ink-3"> · {c.name}</span> : null}
                        </span>
                        <span className="mono shrink-0 text-[11px] text-ink-4">{s.minutes} min · {formatRelative(s.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            <div className="border-t border-line pt-5">
              <TextAction
                className="text-danger hover:text-danger"
                onClick={() => {
                  if (!window.confirm(`Remove "${subject.name}" and all its material, concepts and progress? This can't be undone.`)) return;
                  removeSubject(subject.id);
                  router.push("/library");
                  toast.message("Subject removed.");
                }}
              >
                Remove subject
              </TextAction>
            </div>
          </aside>
        </div>
      )}

      <Sheet open={!!retryDoc} onClose={() => setRetryDoc(null)} title="Understanding again" description={retryDoc?.name}>
        {retryDoc && (
          <RerunFlow
            doc={retryDoc}
            onDone={(n) => {
              setRetryDoc(null);
              toast.success(n ? `${plural(n, "new concept")} added to ${subject.name}.` : "Understood. No new concepts this time.");
            }}
            onCancel={() => setRetryDoc(null)}
          />
        )}
      </Sheet>

      <Sheet open={upload} onClose={() => setUpload(false)} title={`Add to ${subject.name}`} description="Everything is parsed in your browser. Only compact passages reach the model." wide>
        <UploadFlow
          subjectId={subject.id}
          onCancel={() => setUpload(false)}
          onDone={({ concepts: n }) => {
            setUpload(false);
            toast.success(n ? `${plural(n, "new concept")} added to ${subject.name}.` : "Material added. No new concepts this time.");
          }}
        />
      </Sheet>
    </div>
  );
}

function DocumentRow({ doc, onRemove, onRetry }: { doc: StudyDocument; onRemove: () => void; onRetry: () => void }) {
  const kind = DOCUMENT_KINDS.find((k) => k.key === doc.kind)?.label ?? doc.kind;
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line py-3.5">
      <div className="min-w-0">
        <p className="truncate text-[14.5px] text-ink">{doc.name}</p>
        <p className="mono mt-0.5 text-[11px] text-ink-4">
          {kind} · {doc.pages ? `${doc.pages} pages` : `${Math.round(doc.chars / 1000)}k chars`} · {doc.chunks.length} passages · {formatRelative(doc.createdAt)}
          {doc.status === "failed" && <span className="text-danger"> · failed: {doc.error}</span>}
          {doc.status === "understanding" && <span className="text-warn"> · interrupted</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {doc.status !== "understood" && <TextAction onClick={onRetry} aria-label={`Retry understanding ${doc.name}`}>Retry</TextAction>}
        <TextAction onClick={onRemove} aria-label={`Remove ${doc.name}`}>Remove</TextAction>
      </div>
    </li>
  );
}
