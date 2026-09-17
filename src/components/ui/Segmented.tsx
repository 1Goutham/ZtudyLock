"use client";

import { cx } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Text options; the active one carries a hairline underline. */
export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: { value: T; onChange: (v: T) => void; options: Option<T>[]; className?: string; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx("inline-flex items-center gap-6", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} title={o.hint} onClick={() => onChange(o.value)} className={cx("relative py-1 text-[14px] transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {o.label}
            <span className={cx("absolute inset-x-0 -bottom-px h-px origin-left bg-ink transition-transform duration-300", active ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
