"use client";

import { useCallback, useRef, useState } from "react";
import { ai } from "../ai/client";
import type { ExtractedConcept } from "../ai/contracts";
import { MAX_DOCUMENT_CHARS, UNDERSTAND_BATCH } from "../constants";
import { extractText, isImage, isPdf, isTextLike } from "../documents/extract";
import { chunkText } from "../learning/chunk";
import { useWorkspace, useWorkspaceActions } from "../store";
import type { Chunk, Concept, DocumentKind, StudyDocument } from "../types";
import { normaliseName, readFileAsDataUrl } from "../utils";

/**
 * The "understand" pipeline, in the browser:
 *   read the file → chunk it → extract concepts a few chunks at a time →
 *   merge them into the subject's learning map.
 * Every stage below reports real progress; nothing is simulated.
 */

/** Batches per document; beyond this, chunks are sampled evenly to stay cheap. */
const MAX_BATCHES = 12;

export type UnderstandStage = "idle" | "reading" | "extracting" | "mapping" | "done" | "failed";

export interface UnderstandProgress {
  stage: UnderstandStage;
  fileName: string | null;
  fileIndex: number;
  fileCount: number;
  /** Pages read so far, when the source is a PDF. */
  pages: { done: number; total: number } | null;
  batches: { done: number; total: number };
  conceptsFound: number;
  relationshipsFound: number;
  error: string | null;
}

const IDLE: UnderstandProgress = { stage: "idle", fileName: null, fileIndex: 0, fileCount: 0, pages: null, batches: { done: 0, total: 0 }, conceptsFound: 0, relationshipsFound: 0, error: null };

export interface UnderstandInput {
  subjectId: string;
  kind: DocumentKind;
  files?: File[];
  pasted?: { name: string; text: string } | null;
}

export function useUnderstand() {
  const { subjects, concepts } = useWorkspace();
  const { addDocument, updateDocument, addConcepts, updateConcept } = useWorkspaceActions();
  const [progress, setProgress] = useState<UnderstandProgress>(IDLE);
  const abort = useRef<AbortController | null>(null);
  const conceptsRef = useRef(concepts);
  conceptsRef.current = concepts;

  const cancel = useCallback(() => abort.current?.abort(), []);
  const reset = useCallback(() => setProgress(IDLE), []);

  /** Extract concepts from a stored document's chunks and merge them into the subject map. */
  const understandDocument = useCallback(
    async (doc: StudyDocument, subjectName: string, controller: AbortController, update: (patch: Partial<UnderstandProgress>) => void, createdSoFar: number): Promise<Concept[]> => {
      const batches = batchChunks(doc.chunks);
      update({ stage: "extracting", batches: { done: 0, total: batches.length } });
      const found: ExtractedConcept[] = [];
      for (let b = 0; b < batches.length; b++) {
        if (controller.signal.aborted) throw new Error("Cancelled.");
        const known = Array.from(new Set([...conceptsRef.current.filter((c) => c.subjectId === doc.subjectId).map((c) => c.name), ...found.map((c) => c.name)])).slice(0, 80);
        const res = await ai.understand(
          { subject: subjectName, document: { name: doc.name, kind: doc.kind }, chunks: batches[b].map((c) => ({ id: c.id, heading: c.heading, text: c.text })), knownConcepts: known },
          controller.signal,
        );
        if (!res.ok) {
          // A rate limit mid-way shouldn't throw away what we have.
          if (res.error.code === "rate_limited" && found.length) break;
          throw new Error(res.error.message);
        }
        found.push(...res.data.concepts);
        update({ batches: { done: b + 1, total: batches.length }, conceptsFound: found.length + createdSoFar });
      }

      update({ stage: "mapping" });
      const merged = mergeConcepts(doc.subjectId, doc.id, found, conceptsRef.current, { addConcepts, updateConcept });
      conceptsRef.current = [...conceptsRef.current.filter((c) => !merged.updatedIds.has(c.id)), ...merged.updated, ...merged.added];
      const relationships = [...merged.added, ...merged.updated].reduce((n, c) => n + c.related.length, 0);
      update({ conceptsFound: createdSoFar + merged.added.length, relationshipsFound: relationships });
      updateDocument(doc.id, { status: "understood", understoodAt: new Date().toISOString(), error: null });
      return merged.added;
    },
    [addConcepts, updateConcept, updateDocument],
  );

  const run = useCallback(
    async (input: UnderstandInput): Promise<{ documents: StudyDocument[]; concepts: Concept[] }> => {
      const subject = subjects.find((s) => s.id === input.subjectId);
      if (!subject) throw new Error("Subject not found.");
      const controller = new AbortController();
      abort.current = controller;

      const sources: { name: string; file: File | null; text: string | null }[] = [
        ...(input.files ?? []).map((f) => ({ name: f.name, file: f, text: null })),
        ...(input.pasted?.text.trim() ? [{ name: input.pasted.name || "Pasted notes", file: null, text: input.pasted.text }] : []),
      ];
      if (!sources.length) throw new Error("Add a file or paste some notes first.");

      const createdDocs: StudyDocument[] = [];
      const createdConcepts: Concept[] = [];
      const update = (patch: Partial<UnderstandProgress>) => setProgress((p) => ({ ...p, ...patch }));
      setProgress({ ...IDLE, stage: "reading", fileCount: sources.length });

      try {
        for (let i = 0; i < sources.length; i++) {
          const src = sources[i];
          update({ stage: "reading", fileName: src.name, fileIndex: i, pages: null, batches: { done: 0, total: 0 }, error: null });

          // 1. Read.
          let text = src.text ?? "";
          let pages: number | null = null;
          let source: StudyDocument["source"] = "paste";
          if (src.file) {
            if (isPdf(src.file) || isTextLike(src.file)) {
              const out = await extractText(src.file, (done, total) => update({ pages: { done, total } }));
              text = out.text;
              pages = out.pages;
              source = "upload";
            } else if (isImage(src.file)) {
              const dataUrl = await readFileAsDataUrl(src.file);
              const mime = src.file.type as "image/png" | "image/jpeg" | "image/webp";
              const res = await ai.transcribe({ image: dataUrl.split(",")[1] ?? "", mime }, controller.signal);
              if (!res.ok) throw new Error(res.error.message);
              text = res.data.text;
              source = "image";
              if (!text.trim()) throw new Error(`Couldn't read any study content in ${src.name}.`);
            } else {
              throw new Error(`${src.name}: unsupported file type.`);
            }
          }
          if (controller.signal.aborted) throw new Error("Cancelled.");
          text = text.slice(0, MAX_DOCUMENT_CHARS);

          // 2. Chunk and store, so the material is in the library even if the model fails.
          const chunks = chunkText(text);
          if (!chunks.length) throw new Error(`${src.name} seems to be empty.`);
          const doc = addDocument({ subjectId: subject.id, name: src.name, kind: input.kind, source, pages, chars: text.length, chunks, status: "understanding", error: null });
          createdDocs.push(doc);

          // 3–4. Extract concepts and merge them into the map.
          createdConcepts.push(...(await understandDocument(doc, subject.name, controller, update, createdConcepts.length)));
        }
        update({ stage: "done", fileName: null });
        return { documents: createdDocs, concepts: createdConcepts };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong while reading your material.";
        for (const d of createdDocs) if (d.status !== "understood") updateDocument(d.id, { status: "failed", error: message });
        update({ stage: "failed", error: message });
        throw e;
      } finally {
        abort.current = null;
      }
    },
    [subjects, addDocument, updateDocument, understandDocument],
  );

  /** Re-run concept extraction for a document that is already stored (failed or interrupted). */
  const rerun = useCallback(
    async (doc: StudyDocument): Promise<Concept[]> => {
      const subject = subjects.find((s) => s.id === doc.subjectId);
      if (!subject) throw new Error("Subject not found.");
      const controller = new AbortController();
      abort.current = controller;
      const update = (patch: Partial<UnderstandProgress>) => setProgress((p) => ({ ...p, ...patch }));
      setProgress({ ...IDLE, stage: "extracting", fileName: doc.name, fileCount: 1, pages: doc.pages ? { done: doc.pages, total: doc.pages } : null });
      updateDocument(doc.id, { status: "understanding", error: null });
      try {
        const added = await understandDocument(doc, subject.name, controller, update, 0);
        update({ stage: "done", fileName: null });
        return added;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong while reading your material.";
        updateDocument(doc.id, { status: "failed", error: message });
        update({ stage: "failed", error: message });
        throw e;
      } finally {
        abort.current = null;
      }
    },
    [subjects, updateDocument, understandDocument],
  );

  return { run, rerun, cancel, reset, progress };
}

function batchChunks(chunks: Chunk[]): Chunk[][] {
  let pool = chunks;
  const maxChunks = MAX_BATCHES * UNDERSTAND_BATCH;
  if (pool.length > maxChunks) {
    const step = pool.length / maxChunks;
    pool = Array.from({ length: maxChunks }, (_, i) => chunks[Math.floor(i * step)]);
  }
  const out: Chunk[][] = [];
  for (let i = 0; i < pool.length; i += UNDERSTAND_BATCH) out.push(pool.slice(i, i + UNDERSTAND_BATCH));
  return out;
}

function mergeConcepts(
  subjectId: string,
  docId: string,
  found: ExtractedConcept[],
  existing: Concept[],
  actions: { addConcepts: (c: Omit<Concept, "id" | "createdAt">[]) => Concept[]; updateConcept: (id: string, patch: Partial<Concept>) => void },
): { added: Concept[]; updated: Concept[]; updatedIds: Set<string> } {
  const own = existing.filter((c) => c.subjectId === subjectId);
  const byName = new Map(own.map((c) => [normaliseName(c.name), c]));
  const toAdd = new Map<string, Omit<Concept, "id" | "createdAt">>();
  const updated: Concept[] = [];
  const updatedIds = new Set<string>();

  for (const f of found) {
    const key = normaliseName(f.name);
    if (!key) continue;
    const prior = byName.get(key);
    if (prior) {
      const next: Concept = {
        ...prior,
        summary: prior.summary.length >= f.summary.length ? prior.summary : f.summary,
        definition: prior.definition ?? f.definition,
        chapter: prior.chapter ?? f.chapter,
        importance: prior.importance === "core" || f.importance === "core" ? "core" : "supporting",
        sourceDocIds: Array.from(new Set([...prior.sourceDocIds, docId])),
        sourceChunkIds: Array.from(new Set([...prior.sourceChunkIds, ...f.chunkIds])),
        related: Array.from(new Set([...prior.related, ...f.related.filter((r) => normaliseName(r) !== key)])).slice(0, 6),
      };
      actions.updateConcept(prior.id, next);
      updated.push(next);
      updatedIds.add(prior.id);
      continue;
    }
    const pending = toAdd.get(key);
    if (pending) {
      pending.sourceChunkIds = Array.from(new Set([...pending.sourceChunkIds, ...f.chunkIds]));
      pending.related = Array.from(new Set([...pending.related, ...f.related])).slice(0, 6);
      if (f.summary.length > pending.summary.length) pending.summary = f.summary;
      pending.definition = pending.definition ?? f.definition;
      continue;
    }
    toAdd.set(key, {
      subjectId,
      name: f.name,
      summary: f.summary,
      definition: f.definition,
      importance: f.importance,
      chapter: f.chapter,
      sourceDocIds: [docId],
      sourceChunkIds: f.chunkIds,
      related: f.related.filter((r) => normaliseName(r) !== key).slice(0, 6),
    });
  }
  const added = toAdd.size ? actions.addConcepts(Array.from(toAdd.values())) : [];
  return { added, updated, updatedIds };
}
