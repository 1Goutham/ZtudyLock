"use client";

import { useEffect, useRef } from "react";
import { useUnderstand } from "@/lib/hooks/useUnderstand";
import type { StudyDocument } from "@/lib/types";
import { Button, TextAction } from "@/components/ui";
import { UnderstandingProgress } from "./UnderstandingProgress";

/** Re-run concept extraction over a stored document; no re-upload needed. */
export function RerunFlow({ doc, onDone, onCancel }: { doc: StudyDocument; onDone: (added: number) => void; onCancel: () => void }) {
  const { rerun, cancel, progress } = useUnderstand();
  const started = useRef(false);
  const start = async () => {
    try {
      onDone((await rerun(doc)).length);
    } catch {
      /* progress shows the error */
    }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <UnderstandingProgress progress={progress} />
      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        {progress.stage === "failed" ? (
          <>
            <p className="max-w-sm text-[13px] text-danger">{progress.error}</p>
            <div className="flex items-center gap-4">
              <TextAction onClick={onCancel}>Close</TextAction>
              <Button variant="primary" size="sm" onClick={start}>Try again</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-ink-3">Only short passages go to the model.</p>
            <TextAction onClick={() => { cancel(); onCancel(); }}>Cancel</TextAction>
          </>
        )}
      </div>
    </div>
  );
}
