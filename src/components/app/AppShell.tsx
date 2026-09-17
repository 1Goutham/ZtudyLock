"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AUTHOR } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cx, firstName } from "@/lib/utils";
import { Logo } from "@/components/ui";
import { ChromeProvider, useChrome } from "./Chrome";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/learn", label: "Learn" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ChromeProvider>
      <Shell>{children}</Shell>
    </ChromeProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, profile } = useWorkspace();
  const { hidden } = useChrome();

  useEffect(() => {
    if (ready && !profile?.onboardingCompletedAt) router.replace("/onboarding");
  }, [ready, profile, router]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initial = profile ? firstName(profile.name).charAt(0).toUpperCase() || "·" : "·";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className={cx("sticky top-0 z-30 px-3 pt-3 transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)] md:px-6 md:pt-4", hidden && "-translate-y-[120%] opacity-0 pointer-events-none")}>
        <div className="glass-float relative mx-auto flex h-14 max-w-[1100px] items-center justify-between rounded-full pl-5 pr-2">
          <Logo href="/home" />
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("press rounded-full px-4 py-1.5 text-[13.5px] transition-colors", active ? "bg-white/10 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]" : "text-ink-3 hover:bg-white/6 hover:text-ink")}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <Link href="/settings" className="glass glass-hover mono flex size-10 items-center justify-center rounded-full text-[11px] text-ink" aria-label="Settings" title={profile?.name}>
            {ready ? initial : "·"}
          </Link>
        </div>
      </header>

      <main className={cx("mx-auto w-full max-w-[1200px] flex-1 px-5 pt-8 md:px-10 md:pt-12", hidden ? "pb-10" : "pb-32 md:pb-24")}>
        {ready && profile?.onboardingCompletedAt ? children : <ShellSkeleton />}
      </main>

      {!hidden && (
        <footer className="mx-auto hidden w-full max-w-[1200px] items-center justify-between gap-4 border-t border-line px-5 py-6 text-[12px] text-ink-3 md:flex md:px-10">
          <p>
            © {new Date().getFullYear()} ZtudyLock · A product by{" "}
            <a href={AUTHOR.site} target="_blank" rel="noreferrer" className="link-underline text-ink">
              {AUTHOR.handle} ↗
            </a>
          </p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="link-underline hover:text-ink">
            Back to top ↑
          </button>
        </footer>
      )}

      {/* Mobile: floating glass navigation. */}
      <nav
        aria-label="Primary"
        className={cx(
          "fixed inset-x-4 bottom-4 z-30 md:hidden transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)]",
          hidden && "translate-y-[140%] opacity-0 pointer-events-none",
        )}
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <ul className="float flex h-14 items-center justify-between rounded-full px-2">
          {NAV.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex-1">
                <Link href={href} aria-current={active ? "page" : undefined} className={cx("press flex h-10 flex-col items-center justify-center rounded-full text-[11.5px] transition-colors", active ? "text-ink" : "text-ink-3")}>
                  <span className={cx("mb-1 size-1 rounded-full transition-colors", active ? "bg-accent" : "bg-transparent")} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="animate-fade space-y-4" aria-hidden="true">
      <div className="h-3 w-16 rounded animate-shimmer" />
      <div className="h-10 w-72 rounded animate-shimmer" />
      <div className="mt-10 h-40 rounded-[20px] animate-shimmer" />
    </div>
  );
}
