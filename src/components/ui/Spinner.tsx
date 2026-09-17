import { cx } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Three softly pulsing dots; ZtudyLock "thinking". */
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}
