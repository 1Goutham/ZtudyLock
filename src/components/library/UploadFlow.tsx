"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ACCEPTED_FILES, DOCUMENT_KINDS, MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { isImage, isPdf, isTextLike } from "@/lib/documents/extract";
import { useUnderstand } from "@/lib/hooks/useUnderstand";
import type { DocumentKind } from "@/lib/types";
import { cx } from "@/lib/utils";
import { Button, Chip, ChipGroup, IconUpload, IconX, TextAction, Textarea } from "@/components/ui";
import { UnderstandingProgress } from "./UnderstandingProgress";

/**
 * Add material to a subject: drop files or paste notes, pick what they are,
 * then watch ZtudyLock understand them. Used by the Library and onboarding.
 */
export function UploadFlow({ subjectId, onDone, onCancel, compact }: { subjectId: string; onDone: (summary: { concepts: number; documents: number }) => void; onCancel?: () => void; compact?: boolean }) {
  const { run, cancel, reset, progress } = useUnderstand();
  const [files, setFiles] = useState<File[]>([]);
  const [pasted, setPasted] = useState("");
  const [kind, setKind] = useState<DocumentKind>("notes");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = progress.stage === "done";

  useEffect(() => () => cancel(), [cancel]);

  const accept = useCallback((incoming: FileList | File[]) => {
    const next: File[] = [];
    for (const f of Array.from(incoming)) {
      if (!(isPdf(f) || isTextLike(f) || isImage(f))) {
        toast.error(`${f.name}: PDFs, text files and images only.`);
        continue;
      }
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name} is larger than 25 MB.`);
        continue;
      }
      if (isImage(f) && f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: keep images under 4 MB.`);
        continue;
      }
      next.push(f);
    }
    setFiles((prev) => [...prev, ...next.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))].slice(0, 8));
  }, []);

  const start = async () => {
    if (!files.length && !pasted.trim()) return toast.message("Add a file or paste some notes first.");
    setRunning(true);
    try {
      const out = await run({ subjectId, kind, files, pasted: pasted.trim() ? { name: pastedName(pasted), text: pasted } : null });
      onDone({ concepts: out.concepts.length, documents: out.documents.length });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that material.");
    } finally {
      setRunning(false);
    }
  };

  if (running || done || progress.stage === "failed") {
    return (
      <div>
        <UnderstandingProgress progress={progress} />
        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          {progress.stage === "failed" ? (
            <>
              <p className="max-w-sm text-[13px] text-danger">{progress.error}</p>
              <Button variant="primary" size="sm" onClick={() => { reset(); setRunning(false); }}>Try again</Button>
            </>
          ) : running ? (
            <>
              <p className="text-[12.5px] text-ink-3">Your material stays in this browser. Only short passages go to the model.</p>
              <TextAction onClick={cancel}>Cancel</TextAction>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
        className={cx(
          "group flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-6 text-center transition-colors",
          compact ? "py-10" : "py-14",
          dragging ? "border-ink bg-white/6" : "border-line-2 hover:border-ink-3 hover:bg-white/3",
        )}
      >
        <IconUpload size={20} className="text-ink-3 transition-colors group-hover:text-ink" />
        <p className="mt-4 text-[15px] text-ink">Drop PDFs, notes or photographed pages</p>
        <p className="mt-1 text-[12.5px] text-ink-3">or click to choose · up to 8 files · PDF, TXT, MD, PNG, JPG</p>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_FILES} className="sr-only" onChange={(e) => e.target.files && accept(e.target.files)} />
      </div>

      {files.length > 0 && (
        <ul className="border-t border-line animate-fade">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-4 border-b border-line py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] text-ink">{f.name}</p>
                <p className="mono mt-0.5 text-[11px] text-ink-4">{isPdf(f) ? "PDF" : isImage(f) ? "Image · transcribed by the model" : "Text"} · {(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={`Remove ${f.name}`} className="press flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-white/8 hover:text-ink">
                <IconX size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="label mb-3">Or paste notes</p>
        <Textarea autosize minRows={3} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste a chapter, your class notes, anything you want to learn from…" />
      </div>

      <div>
        <p className="label mb-3">What is this?</p>
        <ChipGroup>
          {DOCUMENT_KINDS.map((k) => (
            <Chip key={k.key} size="sm" selected={kind === k.key} onClick={() => setKind(k.key)} title={k.hint}>
              {k.label}
            </Chip>
          ))}
        </ChipGroup>
        {kind === "question-paper" && <p className="mt-3 text-[12.5px] text-ink-3">Question papers are kept for exam analysis and mock tests; concepts are still extracted from them.</p>}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-5">
        {onCancel ? <TextAction onClick={onCancel}>Cancel</TextAction> : <span />}
        <Button variant="primary" onClick={start} disabled={!files.length && !pasted.trim()}>
          Understand this material
        </Button>
      </div>
    </div>
  );
}

function pastedName(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "Pasted notes";
  return line.length > 48 ? `${line.slice(0, 47)}…` : line;
}
