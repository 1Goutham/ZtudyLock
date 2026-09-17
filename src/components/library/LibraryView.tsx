"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { subjectMastery } from "@/lib/learning/mastery";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import { plural } from "@/lib/utils";
import { Button, IconArrowRight, Input, Meter, TextAction } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export function LibraryView() {
  const router = useRouter();
  const { subjects, documents, concepts, attempts } = useWorkspace();
  const { addSubject } = useWorkspaceActions();
  const [adding, setAdding] = useState(subjects.length === 0);
  const [name, setName] = useState("");

  const create = (thenUpload: boolean) => {
    const n = name.trim();
    if (!n) return toast.message("Give the subject a name.");
    if (subjects.some((s) => s.name.toLowerCase() === n.toLowerCase())) return toast.message("You already have that subject.");
    const subject = addSubject(n);
    setName("");
    setAdding(false);
    router.push(thenUpload ? `/library/${subject.id}?upload=1` : `/library/${subject.id}`);
  };

  return (
    <div>
      <PageHeader
        index="Library"
        title="Your material"
        description="Everything you've given ZtudyLock to learn from, organised by subject. Add a subject, then upload notes, chapters, slides or past papers."
        actions={!adding && <Button variant="primary" size="sm" onClick={() => setAdding(true)}>+ Add subject</Button>}
      />

      {adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); create(true); }}
          className="mb-14 grid grid-cols-1 gap-6 border-t border-line pt-6 animate-rise md:grid-cols-12"
        >
          <div className="md:col-span-4">
            <p className="text-[17px] text-ink">New subject</p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-3">A course, a module, an exam paper. You&apos;ll add material next.</p>
          </div>
          <div className="md:col-span-8">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Operating Systems" aria-label="Subject name" />
            <div className="mt-6 flex items-center justify-end gap-5">
              {subjects.length > 0 && <TextAction type="button" onClick={() => setAdding(false)}>Cancel</TextAction>}
              <TextAction type="button" onClick={() => create(false)}>Create only</TextAction>
              <Button type="submit" variant="primary" size="sm">Create and add material</Button>
            </div>
          </div>
        </form>
      )}

      {subjects.length === 0 ? (
        !adding && <EmptyState title="Nothing here yet." description="Add a subject and upload what you're studying. ZtudyLock reads it and turns it into concepts you can learn, practise and master." action={<Button variant="primary" onClick={() => setAdding(true)}>Add your first subject</Button>} />
      ) : (
        <>
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <p className="label">Subjects <span className="text-ink-4">({subjects.length})</span></p>
            <p className="mono hidden text-[11px] text-ink-4 sm:block">Documents · Concepts · Mastery</p>
          </div>
          <ul>
            {subjects.map((s, i) => {
              const docs = documents.filter((d) => d.subjectId === s.id);
              const cons = concepts.filter((c) => c.subjectId === s.id);
              const m = subjectMastery(s.id, concepts, attempts);
              return (
                <li key={s.id} className="border-b border-line animate-rise" style={{ "--i": i + 1 } as React.CSSProperties}>
                  <Link href={`/library/${s.id}`} className="group grid grid-cols-1 gap-4 py-6 md:grid-cols-12 md:items-center">
                    <div className="flex items-baseline gap-5 md:col-span-6">
                      <span className="label shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block text-[22px] text-ink transition-colors md:text-[26px]">{s.name}</span>
                        <span className="mt-1 block text-[13px] text-ink-3">
                          {plural(docs.length, "document")} · {plural(cons.length, "concept")}
                          {m.weak.length > 0 && <span className="text-warn"> · {plural(m.weak.length, "weak area")}</span>}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-4 md:col-span-5 md:pl-6">
                      <Meter value={m.score} tone={m.score !== null && m.score < 50 ? "warn" : "accent"} className="max-w-xs" label={`${s.name} mastery`} />
                      <span className="mono w-16 shrink-0 text-right text-[12px] text-ink-3">{m.score === null ? "—" : `${m.score}%`}</span>
                    </div>
                    <div className="hidden justify-end md:col-span-1 md:flex">
                      <IconArrowRight size={16} className="text-ink-4 transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-ink" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
