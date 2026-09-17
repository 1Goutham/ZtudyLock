"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cx } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = BaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

const base = "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-[#050505] hover:bg-white",
  secondary: "glass glass-hover text-ink",
  ghost: "bg-transparent text-ink-2 hover:text-ink hover:bg-white/6",
  danger: "bg-transparent text-danger hover:bg-danger/10",
  accent: "bg-accent text-[#050505] hover:brightness-105",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", loading, full, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cx(base, variants[variant], sizes[size], full && "w-full", className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner className={variant === "primary" || variant === "accent" ? "text-[#050505]" : "text-ink-3"} />}
      {children}
    </button>
  );
});

type LinkButtonProps = BaseProps & { href: string; prefetch?: boolean; target?: string; rel?: string };

export function LinkButton({ href, variant = "secondary", size = "md", full, className, children, prefetch, target, rel }: LinkButtonProps) {
  return (
    <Link href={href} prefetch={prefetch} target={target} rel={rel} className={cx(base, variants[variant], sizes[size], full && "w-full", className)}>
      {children}
    </Link>
  );
}

/** A mono, bracketed text action: [ Test me ]. Quiet enough for toolbars. */
export function TextAction({ className, active, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button className={cx("bracket h-7 text-[12.5px] transition-colors disabled:opacity-40", active ? "text-ink" : "text-ink-2 hover:text-ink", className)} {...rest}>
      <span className="bracket-l" aria-hidden="true">[</span>
      <span className="inline-flex items-center gap-1.5">{children}</span>
      <span className="bracket-r" aria-hidden="true">]</span>
    </button>
  );
}

export function BracketLink({ href, children, className, external }: { href: string; children: React.ReactNode; className?: string; external?: boolean }) {
  const cls = cx("bracket text-[13px] text-ink-2 hover:text-ink", className);
  const inner = (
    <>
      <span className="bracket-l" aria-hidden="true">[</span>
      {children}
      <span className="bracket-r" aria-hidden="true">]</span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}
