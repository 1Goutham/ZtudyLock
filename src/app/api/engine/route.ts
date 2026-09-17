import { NextResponse } from "next/server";
import { engineStatus } from "@/lib/ai/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Engine health for Settings. Never includes keys. */
export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await engineStatus() });
  } catch (e) {
    console.error("engine status failed", e);
    return NextResponse.json({ ok: false, error: { code: "upstream", message: "Couldn't read engine status.", retryable: true } }, { status: 502 });
  }
}
