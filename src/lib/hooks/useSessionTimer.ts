"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceActions } from "../store";
import type { SessionKind } from "../types";

/**
 * Logs study time for the screen the student is on. Counts only while the
 * tab is visible, flushes when they leave, ignores blips under a minute.
 */
export function useSessionTimer(kind: SessionKind, subjectId: string | null, conceptId: string | null, enabled = true) {
  const { logSession } = useWorkspaceActions();
  const start = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      if (start.current === null) start.current = Date.now();
    };
    const pause = () => {
      if (start.current !== null) {
        accumulated.current += Date.now() - start.current;
        start.current = null;
      }
    };
    const onVisibility = () => (document.visibilityState === "visible" ? resume() : pause());
    resume();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      const minutes = accumulated.current / 60_000;
      accumulated.current = 0;
      if (minutes >= 0.75) logSession({ kind, subjectId, conceptId, minutes: Math.max(1, Math.round(minutes)) });
    };
  }, [kind, subjectId, conceptId, enabled, logSession]);
}
