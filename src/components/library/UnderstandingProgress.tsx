"use client";

import type { UnderstandProgress } from "@/lib/hooks/useUnderstand";
import { cx } from "@/lib/utils";
import { Meter } from "@/components/ui";

/**
 * "Understanding your material…" Three meters, each bound to a real stage of
 * the pipeline: reading pages, extracting concepts per batch, building the map.
 */
export function UnderstandingProgress({ progress }: { progress: UnderstandProgress }) {
  const { stage, pages, batches, conceptsFound, relationshipsFound, fileName, fileIndex, fileCount } = progress;
  const readPct = stage === "reading" ? (pages && pages.total ? (pages.done / pages.total) * 100 : 15) : stage === "idle" ? 0 : 100;
  const extractPct = stage === "extracting" ? (batches.total ? (batches.done / batches.total) * 100 : 5) : stage === "mapping" || stage === "done" ? 100 : 0;
  const mapPct = stage === "mapping" ? 60 : stage === "done" ? 100 : 0;
  const active = stage !== "idle" && stage !== "done" && stage !== "failed";

  return (
    <div className="animate-fade">
      <p className={cx("display text-[26px] text-ink md:text-[30px]", active && "animate-breathe")}>
        {stage === "done" ? "Understood." : stage === "failed" ? "That didn't work." : "Understanding your material…"}
      </p>
      <p className="mono mt-2 text-[11.5px] text-ink-3">
        {fileName ? `${fileName}${fileCount > 1 ? ` · ${fileIndex + 1} of ${fileCount}` : ""}` : stage === "done" ? `${conceptsFound} concepts, ${relationshipsFound} relationships` : " "}
      </p>

      <ol className="mt-8 flex flex-col gap-6">
        <Stage label="Reading pages" detail={pages ? `${pages.done} / ${pages.total} pages` : stage === "reading" ? "Parsing" : readPct === 100 ? "Done" : ""} value={readPct} active={stage === "reading"} />
        <Stage label="Extracting concepts" detail={batches.total ? `${batches.done} / ${batches.total} passes · ${conceptsFound} found` : extractPct === 100 ? "Done" : ""} value={extractPct} active={stage === "extracting"} />
        <Stage label="Building your learning map" detail={stage === "done" ? `${relationshipsFound} relationships` : stage === "mapping" ? "Linking concepts" : ""} value={mapPct} active={stage === "mapping"} />
      </ol>
    </div>
  );
}

function Stage({ label, detail, value, active }: { label: string; detail: string; value: number; active: boolean }) {
  return (
    <li>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <span className={cx("text-[14.5px] transition-colors", active || value === 100 ? "text-ink" : "text-ink-4")}>{label}</span>
        <span className="mono text-[11px] text-ink-3">{detail}</span>
      </div>
      <Meter value={value} tone={value === 100 ? "quiet" : "accent"} />
    </li>
  );
}
