import type { FlashcardsRequest, FlashcardsResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { ANALYST_SYSTEM, flashcardsPrompt } from "@/lib/ai/prompts";
import { isObj, num, parseBrief, parsePassages, str, strArr, withAiRoute } from "@/lib/ai/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAiRoute<FlashcardsRequest, FlashcardsResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const brief = parseBrief(body.brief);
      if (!brief || !brief.concept) return "Pick a concept first.";
      return { brief, count: Math.round(num(body.count, 8, 1, 16)), passages: parsePassages(body.passages), avoid: strArr(body.avoid, 40, 160) };
    },
    (data) =>
      completeJson<FlashcardsResult>(
        { system: ANALYST_SYSTEM, prompt: flashcardsPrompt(data), temperature: 0.6, maxOutputTokens: 2200 },
        (v) => {
          if (!isObj(v) || !Array.isArray(v.cards)) return null;
          const cards = v.cards
            .filter(isObj)
            .map((c) => ({ front: str(c.front, 300).trim(), back: str(c.back, 800).trim() }))
            .filter((c) => c.front && c.back);
          return cards.length ? { cards: cards.slice(0, data.count) } : null;
        },
      ),
  );
}
