"use client";

import { cx } from "@/lib/utils";

interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onToggle"> {
  selected?: boolean;
  size?: "sm" | "md";
  checkable?: boolean;
}

export function Chip({ selected, size = "md", checkable, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "press inline-flex items-center gap-2 rounded-full border font-normal select-none disabled:opacity-40",
        size === "sm" ? "h-8 px-3.5 text-[13px]" : "h-9 px-4 text-[14px]",
        selected ? "border-ink bg-ink text-[#050505] shadow-[0_10px_24px_-14px_rgb(255_255_255/0.35)]" : "glass glass-hover text-ink-2 hover:text-ink",
        className,
      )}
      {...rest}
    >
      {checkable && <span className={cx("size-1.5 rounded-full transition-colors", selected ? "bg-accent" : "bg-ink-4")} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ChipGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap gap-2", className)}>{children}</div>;
}
