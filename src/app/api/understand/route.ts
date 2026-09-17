import type { ExtractedConcept, UnderstandRequest, UnderstandResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { ANALYST_SYSTEM, understandPrompt } from "@/lib/ai/prompts";
import { isObj, str, strArr, withAiRoute } from "@/lib/ai/route";
import { DOCUMENT_KINDS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAiRoute<UnderstandRequest, UnderstandResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const subject = str(body.subject, 120).trim();
      if (!subject) return "Missing subject.";
      const doc = isObj(body.document) ? body.document : {};
      const kind = DOCUMENT_KINDS.some((k) => k.key === doc.kind) ? (doc.kind as UnderstandRequest["document"]["kind"]) : "other";
      const chunks = Array.isArray(body.chunks)
        ? body.chunks
            .filter(isObj)
            .map((c) => ({ id: str(c.id, 60), heading: typeof c.heading === "string" ? c.heading.slice(0, 120) : null, text: str(c.text, 2_400).trim() }))
            .filter((c) => c.id && c.text)
            .slice(0, 8)
        : [];
      if (!chunks.length) return "Nothing to read.";
      return { subject, document: { name: str(doc.name, 160) || "Document", kind }, chunks, knownConcepts: strArr(body.knownConcepts, 80, 100) };
    },
    (data) => {
      const validIds = new Set(data.chunks.map((c) => c.id));
      return completeJson<UnderstandResult>(
        { system: ANALYST_SYSTEM, prompt: understandPrompt(data), temperature: 0.25, maxOutputTokens: 3000 },
        (v) => {
          if (!isObj(v) || !Array.isArray(v.concepts)) return null;
          const concepts: ExtractedConcept[] = v.concepts
            .filter(isObj)
            .map((c) => ({
              name: str(c.name, 120).trim(),
              summary: str(c.summary, 800).trim(),
              definition: typeof c.definition === "string" && c.definition.trim() ? c.definition.trim().slice(0, 500) : null,
              importance: (c.importance === "supporting" ? "supporting" : "core") as ExtractedConcept["importance"],
              chapter: typeof c.chapter === "string" && c.chapter.trim() ? c.chapter.trim().slice(0, 120) : null,
              chunkIds: strArr(c.chunkIds, 8, 60).filter((id) => validIds.has(id)),
              related: strArr(c.related, 4, 100),
            }))
            .filter((c) => c.name && c.summary)
            .slice(0, 10);
          return { chapters: strArr(v.chapters, 20, 120), concepts };
        },
        "analyse",
      );
    },
  );
}
