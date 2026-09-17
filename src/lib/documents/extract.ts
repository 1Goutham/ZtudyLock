import { MAX_DOCUMENT_CHARS } from "../constants";
import { normaliseText } from "../learning/chunk";
import { readTextFile } from "../utils";

/**
 * Turn an uploaded file into text, in the browser. PDFs are parsed with
 * pdf.js (loaded on demand so it never touches the initial bundle); text
 * files are read directly. Images are handled by the caller via
 * `/api/transcribe`, one at a time.
 */

export interface Extracted {
  text: string;
  pages: number | null;
  truncated: boolean;
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}
export function isImage(file: File): boolean {
  return /^image\/(png|jpe?g|webp)$/.test(file.type);
}
export function isTextLike(file: File): boolean {
  return file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name);
}

export async function extractText(file: File, onProgress?: (done: number, total: number) => void): Promise<Extracted> {
  if (isPdf(file)) return extractPdf(file, onProgress);
  if (isTextLike(file)) return finish(await readTextFile(file), null);
  throw new Error("Unsupported file type.");
}

function finish(raw: string, pages: number | null): Extracted {
  const text = normaliseText(raw);
  const truncated = text.length > MAX_DOCUMENT_CHARS;
  return { text: truncated ? text.slice(0, MAX_DOCUMENT_CHARS) : text, pages, truncated };
}

async function extractPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  let chars = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5] as number;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trimEnd());
        line = "";
      }
      line += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    if (line.trim()) lines.push(line.trimEnd());
    const pageText = lines.join("\n").replace(/\n{2,}/g, "\n").trim();
    if (pageText) parts.push(pageText);
    chars += pageText.length;
    onProgress?.(p, pdf.numPages);
    page.cleanup();
    if (chars > MAX_DOCUMENT_CHARS) break;
  }
  await pdf.destroy();

  if (!parts.join("").trim()) {
    throw new Error("This PDF has no selectable text. It may be scanned; try uploading pages as images instead.");
  }
  return finish(parts.join("\n\n"), pdf.numPages);
}
