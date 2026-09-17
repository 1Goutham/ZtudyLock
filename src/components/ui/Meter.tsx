import { cx } from "@/lib/utils";

/** A hairline progress meter. `value` is 0–100; null renders an empty track. */
export function Meter({ value, tone = "accent", className, label }: { value: number | null; tone?: "accent" | "quiet" | "warn"; className?: string; label?: string }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cx("meter", tone === "quiet" && "is-quiet", tone === "warn" && "is-warn", className)} role="progressbar" aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
