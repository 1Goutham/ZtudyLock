"use client";

import Link from "next/link";
import { useFocusMode } from "@/components/app/Chrome";
import { IconX } from "@/components/ui";

/** The only chrome in a full-screen learning mode: an exit, a title, a count, a hairline of progress. */
export function FocusBar({ title, meta, progress, exitHref = "/practice", onExit }: { title: React.ReactNode; meta?: React.ReactNode; progress: number; exitHref?: string; onExit?: () => void }) {
  useFocusMode(true);
  return (
    <div className="mb-10 animate-fade">
      <div className="flex items-center justify-between gap-4">
        {onExit ? (
          <button type="button" onClick={onExit} aria-label="Exit" className="press flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-white/8 hover:text-ink"><IconX size={16} /></button>
        ) : (
          <Link href={exitHref} aria-label="Exit" className="press flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-white/8 hover:text-ink"><IconX size={16} /></Link>
        )}
        <p className="min-w-0 flex-1 truncate text-center text-[13.5px] text-ink-2">{title}</p>
        <p className="mono w-9 text-right text-[12px] text-ink-3 sm:w-auto">{meta}</p>
      </div>
      <div className="mt-4 h-px w-full bg-line">
        <div className="h-px bg-ink transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </div>
  );
}
