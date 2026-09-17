import type { TranscribeRequest, TranscribeResult } from "@/lib/ai/contracts";
import { completeJson } from "@/lib/ai/engine";
import { TRANSCRIBE_SYSTEM, transcribePrompt } from "@/lib/ai/prompts";
import { isObj, str, withAiRoute } from "@/lib/ai/route";
import { MAX_IMAGE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAiRoute<TranscribeRequest, TranscribeResult>(
    req,
    (body) => {
      if (!isObj(body)) return "Invalid request.";
      const mime = body.mime === "image/png" || body.mime === "image/jpeg" || body.mime === "image/webp" ? body.mime : null;
      if (!mime) return "Only PNG, JPEG and WebP images can be transcribed.";
      const image = str(body.image, MAX_IMAGE_BYTES * 1.4).replace(/^data:[^,]+,/, "");
      if (!image) return "Missing image.";
      if (image.length * 0.75 > MAX_IMAGE_BYTES) return "That image is too large. Keep it under 4 MB.";
      return { image, mime };
    },
    (data) =>
      completeJson<TranscribeResult>(
        { system: TRANSCRIBE_SYSTEM, prompt: transcribePrompt(), images: [{ mime: data.mime, data: data.image }], temperature: 0.1, maxOutputTokens: 4000 },
        (v) => (isObj(v) && typeof v.text === "string" ? { text: v.text.trim().slice(0, 60_000) } : null),
        "analyse",
      ),
  );
}
