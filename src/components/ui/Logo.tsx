import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { cx } from "@/lib/utils";

export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cx("shrink-0", className)} aria-hidden="true">
      <path d="M20 24.5a12 12 0 0 1 24 0V28h-5v-3.5a7 7 0 0 0-14 0V28h-5z" fill="currentColor" />
      <rect x="16" y="28" width="32" height="22" rx="6" fill="currentColor" />
      <path d="M26 34h12l-12 10h12" stroke="#050505" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ href = "/", size = 20, className, wordmark = true }: { href?: string; size?: number; className?: string; wordmark?: boolean }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2 text-ink", className)} aria-label={APP_NAME}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-[15px] font-medium tracking-tight">
          <span className="font-normal text-ink-2">Ztudy</span>Lock
        </span>
      )}
    </Link>
  );
}
