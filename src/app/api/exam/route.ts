import type { ExamRequest, ExamResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { ANALYST_SYSTEM, examPrompt } from "@/lib/ai/prompts";
import { isObj, num, str, strArr, withAiRoute } from "@/lib/ai/route";

export const runtime = "nodejs";

/** Total characters of paper text sent per analysis; enough for 3–4 papers. */
const PAPER_BUDGET = 36_000;

export async function POST(req: Request) {
  return withAiRoute<ExamRequest, ExamResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const subject = str(body.subject, 120).trim();
      if (!subject) return "Missing subject.";
      const papers: ExamRequest["papers"] = [];
      let used = 0;
      for (const p of Array.isArray(body.papers) ? body.papers : []) {
        if (!isObj(p)) continue;
        const text = str(p.text, 14_000).trim();
        if (!text) continue;
        if (used + text.length > PAPER_BUDGET) break;
        used += text.length;
        papers.push({ name: str(p.name, 160) || "Paper", text });
        if (papers.length >= 4) break;
      }
      if (!papers.length) return "Add at least one question paper.";
      return { subject, papers, concepts: strArr(body.concepts, 80, 100) };
    },
    (data) =>
      completeJson<ExamResult>(
        { system: ANALYST_SYSTEM, prompt: examPrompt(data), temperature: 0.2, maxOutputTokens: 2600 },
        (v) => {
          if (!isObj(v) || !Array.isArray(v.topics)) return null;
          const topics = v.topics
            .filter(isObj)
            .map((t) => ({
              name: str(t.name, 120).trim(),
              mentions: Math.round(num(t.mentions, 1, 0, 500)),
              marks: typeof t.marks === "number" && Number.isFinite(t.marks) ? Math.round(t.marks) : null,
              matchedConcept: typeof t.matchedConcept === "string" && t.matchedConcept.trim() ? t.matchedConcept.trim().slice(0, 120) : null,
            }))
            .filter((t) => t.name)
            .slice(0, 30);
          const marksDistribution = Array.isArray(v.marksDistribution)
            ? v.marksDistribution
                .filter(isObj)
                .map((d) => ({ label: str(d.label, 80).trim(), marks: Math.round(num(d.marks, 0, 0, 1000)) }))
                .filter((d) => d.label)
                .slice(0, 12)
            : [];
          return { topics, patterns: strArr(v.patterns, 8, 240), marksDistribution, summary: str(v.summary, 600).trim() };
        },
        "analyse",
      ),
  );
}
