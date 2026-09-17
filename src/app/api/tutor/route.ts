import type { TutorRequest, TutorResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { TUTOR_SYSTEM, tutorPrompt } from "@/lib/ai/prompts";
import { isObj, parseBrief, parsePassages, str, withAiRoute } from "@/lib/ai/route";
import { TUTOR_INTENTS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAiRoute<TutorRequest, TutorResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const brief = parseBrief(body.brief);
      if (!brief) return "Missing learning brief.";
      const message = str(body.message, 4_000).trim();
      if (!message) return "Ask something first.";
      const intent = TUTOR_INTENTS.some((i) => i.key === body.intent) ? (body.intent as TutorRequest["intent"]) : null;
      const history = Array.isArray(body.history)
        ? body.history
            .filter(isObj)
            .map((h) => ({ role: h.role === "tutor" ? ("tutor" as const) : ("user" as const), content: str(h.content, 1_200).trim() }))
            .filter((h) => h.content)
            .slice(-8)
        : [];
      return { brief, intent, message, history, passages: parsePassages(body.passages) };
    },
    (data) =>
      completeJson<TutorResult>(
        { system: TUTOR_SYSTEM, prompt: tutorPrompt(data), temperature: 0.6, maxOutputTokens: 1600 },
        (v) => {
          if (!isObj(v)) return null;
          const reply = str(v.reply, 8_000).trim();
          if (!reply) return null;
          const check = typeof v.checkQuestion === "string" ? v.checkQuestion.trim().slice(0, 300) : "";
          return { reply, checkQuestion: check || null };
        },
      ),
  );
}
