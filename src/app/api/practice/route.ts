import type { GeneratedQuestion, PracticeRequest, PracticeResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { ANALYST_SYSTEM, practicePrompt } from "@/lib/ai/prompts";
import { isObj, num, parseBrief, parsePassages, str, strArr, withAiRoute } from "@/lib/ai/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAiRoute<PracticeRequest, PracticeResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const brief = parseBrief(body.brief);
      if (!brief || !brief.concept) return "Pick a concept to practise.";
      const difficulty = body.difficulty === "easy" || body.difficulty === "medium" || body.difficulty === "hard" ? body.difficulty : "mixed";
      return { brief, count: Math.round(num(body.count, 5, 1, 12)), difficulty, passages: parsePassages(body.passages), avoid: strArr(body.avoid, 30, 200), targeted: body.targeted === true };
    },
    (data) =>
      completeJson<PracticeResult>(
        { system: ANALYST_SYSTEM, prompt: practicePrompt(data), temperature: 0.7, maxOutputTokens: 2600 },
        (v) => {
          if (!isObj(v) || !Array.isArray(v.questions)) return null;
          const questions: GeneratedQuestion[] = v.questions
            .filter(isObj)
            .map((q) => ({
              prompt: str(q.prompt, 600).trim(),
              options: strArr(q.options, 4, 300).map((o) => o.trim()),
              answerIndex: Math.round(num(q.answerIndex, -1, 0, 3)),
              explanation: str(q.explanation, 800).trim(),
              difficulty: (q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium") as GeneratedQuestion["difficulty"],
            }))
            .filter((q) => q.prompt && q.options.length === 4 && q.options.every(Boolean) && q.answerIndex >= 0 && q.explanation);
          return questions.length ? { questions: questions.slice(0, data.count) } : null;
        },
      ),
  );
}
