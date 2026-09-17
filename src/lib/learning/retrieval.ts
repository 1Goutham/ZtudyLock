import type { Chunk, StudyDocument } from "../types";

/**
 * Lexical retrieval over document chunks (BM25). No embeddings, no network,
 * no cost: it runs in the browser in a few milliseconds and lets every AI
 * request carry only the passages that matter instead of whole documents.
 */

const STOP = new Set(
  "a an the and or of to in on for with is are was were be been being this that these those it its as at by from into than then there their they them we you your our he she his her i me my not no yes do does did done can could should would will shall may might must have has had having what which who whom whose when where why how all any both each few more most other some such only own same so too very just also about above below over under again further once here up down out off".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map(stem);
}

/** A very small suffix stripper; enough to match "deadlocks" with "deadlock". */
function stem(t: string): string {
  return t.replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, (m, _p, offset: number) => (offset > 3 ? "" : m));
}

export interface Passage {
  chunkId: string;
  docId: string;
  docName: string;
  heading: string | null;
  text: string;
  score: number;
}

interface Indexed {
  chunk: Chunk;
  doc: StudyDocument;
  tf: Map<string, number>;
  len: number;
}

export function buildIndex(documents: StudyDocument[]): Indexed[] {
  const out: Indexed[] = [];
  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const tokens = tokenize(`${chunk.heading ?? ""} ${chunk.heading ?? ""} ${chunk.text}`);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      out.push({ chunk, doc, tf, len: tokens.length });
    }
  }
  return out;
}

export function retrieve(
  documents: StudyDocument[],
  query: string,
  opts: { limit?: number; charBudget?: number; preferChunkIds?: string[] } = {},
): Passage[] {
  const { limit = 4, charBudget = 5_000, preferChunkIds = [] } = opts;
  const index = buildIndex(documents);
  if (!index.length) return [];
  const q = Array.from(new Set(tokenize(query)));
  if (!q.length && !preferChunkIds.length) return [];

  const N = index.length;
  const avg = index.reduce((s, x) => s + x.len, 0) / N || 1;
  const df = new Map<string, number>();
  for (const t of q) df.set(t, index.filter((x) => x.tf.has(t)).length);
  const k1 = 1.4;
  const b = 0.75;
  const prefer = new Set(preferChunkIds);

  const scored = index.map((x) => {
    let score = 0;
    for (const t of q) {
      const f = x.tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * x.len) / avg)));
    }
    if (prefer.has(x.chunk.id)) score += 2.5; // passages the concept was extracted from
    return { x, score };
  });

  const picked: Passage[] = [];
  let used = 0;
  for (const { x, score } of scored.filter((s) => s.score > 0).sort((a, b2) => b2.score - a.score)) {
    if (picked.length >= limit) break;
    if (used + x.chunk.text.length > charBudget && picked.length) break;
    used += x.chunk.text.length;
    picked.push({ chunkId: x.chunk.id, docId: x.doc.id, docName: x.doc.name, heading: x.chunk.heading, text: x.chunk.text, score });
  }
  return picked;
}
