import { CHUNK_MAX, CHUNK_TARGET } from "../constants";
import type { Chunk } from "../types";
import { uid } from "../utils";

/**
 * Split extracted text into passages that are small enough to send to the
 * model a few at a time, and coherent enough to be quoted back to the
 * student. Paragraph boundaries are respected; headings are carried along so
 * the retriever can weight them.
 */

const HEADING = /^(?:(?:chapter|unit|module|section|lesson|part)\s+[\dIVXivx]+[.:)]?\s*.*|\d+(?:\.\d+)*[.)]?\s+[A-Z][^\n]{2,80}|[A-Z][A-Z\s\-:,&/()]{4,80})$/;

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 90 || /[.!?]$/.test(t)) return false;
  return HEADING.test(t);
}

export function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/(\S)-\n(\S)/g, "$1$2") // hyphenated line breaks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(raw: string): Chunk[] {
  const text = normaliseText(raw);
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: Chunk[] = [];
  let heading: string | null = null;
  let buffer = "";
  let bufferHeading: string | null = null;

  const flush = () => {
    const body = buffer.trim();
    if (body) chunks.push({ id: uid("chk"), index: chunks.length, heading: bufferHeading, text: body });
    buffer = "";
    bufferHeading = heading;
  };

  for (const para of paragraphs) {
    const lines = para.split("\n");
    if (lines.length === 1 && isHeading(lines[0])) {
      heading = lines[0].trim();
      if (buffer.length > CHUNK_TARGET * 0.5) flush();
      else bufferHeading = bufferHeading ?? heading;
      continue;
    }
    if (bufferHeading === null && chunks.length === 0) bufferHeading = heading;

    // Very long paragraphs are split on sentence boundaries.
    const pieces = para.length > CHUNK_MAX ? splitSentences(para, CHUNK_TARGET) : [para];
    for (const piece of pieces) {
      if (buffer && buffer.length + piece.length + 2 > CHUNK_TARGET) flush();
      buffer += (buffer ? "\n\n" : "") + piece;
      if (buffer.length >= CHUNK_MAX) flush();
    }
  }
  flush();
  return chunks;
}

function splitSentences(text: string, target: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && cur.length + s.length > target) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
