"use client";

import Link from "next/link";
import { useState } from "react";
import { AUTHOR } from "@/lib/constants";
import { useWorkspace } from "@/lib/store";
import { cx } from "@/lib/utils";
import { BracketLink, IconArrowUpRight, LinkButton, Logo } from "@/components/ui";

const LOOP = ["Upload", "Understand", "Learn", "Practise", "Test", "Revise", "Master"];

const PILLARS = [
  { n: "01", title: "It reads your material", body: "Notes, textbook chapters, slides, past papers. ZtudyLock finds the concepts, the definitions and how they connect, and builds a learning map you can actually work through." },
  { n: "02", title: "It teaches, then checks", body: "Ask for it simply, deeply, with an example or an analogy. Every explanation ends with a short check, and a quiz is one step away." },
  { n: "03", title: "It notices what's weak", body: "Every answer and every flashcard feeds a mastery score per concept. When something slips, ZtudyLock says so and builds a short revision pass to fix it." },
];

const PROCESS = [
  { n: "01.", title: "Tell it what you're studying", body: "Your course, what you're preparing for, when. Under a minute." },
  { n: "02.", title: "Upload your material", body: "PDFs, notes, photographed pages. Everything is parsed in your browser; only compact passages ever reach the model." },
  { n: "03.", title: "Learn concept by concept", body: "A tutor that knows the concept, the passages it came from, your mastery and your recent mistakes." },
  { n: "04.", title: "Practise, and let it adapt", body: "Quizzes, spaced-repetition flashcards, mock tests from your papers. Weak areas get targeted passes until they hold." },
];

export function Landing() {
  const { ready, profile } = useWorkspace();
  const onboarded = ready && !!profile?.onboardingCompletedAt;
  const start = onboarded ? "/home" : "/onboarding";
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 md:pt-4">
        <div className="glass-float mx-auto flex h-14 max-w-[1100px] items-center justify-between rounded-full pl-5 pr-2">
          <Logo />
          <nav className="hidden items-center gap-1 text-[13.5px] md:flex" aria-label="Landing">
            <a href="#what" className="press rounded-full px-4 py-1.5 text-ink-3 hover:bg-white/6 hover:text-ink">What it does</a>
            <a href="#how" className="press rounded-full px-4 py-1.5 text-ink-3 hover:bg-white/6 hover:text-ink">How it works</a>
            <a href={AUTHOR.site} target="_blank" rel="noreferrer" className="press rounded-full px-4 py-1.5 text-ink-3 hover:bg-white/6 hover:text-ink">By {AUTHOR.handle}</a>
          </nav>
          <LinkButton href={start} variant="primary" size="sm" className="h-10">
            {onboarded ? "Open workspace" : "Get started"} <IconArrowUpRight size={14} />
          </LinkButton>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 md:px-10">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-10 pb-20 pt-14 md:grid-cols-12 md:pb-28 md:pt-24">
          <div className="md:col-span-10">
            <p className="label animate-rise mb-8">
              An AI study workspace · <a href={AUTHOR.site} target="_blank" rel="noreferrer" className="link-underline text-ink-2">A product by {AUTHOR.handle}</a>
            </p>
            <h1 className="display animate-rise text-[52px] text-ink sm:text-[76px] md:text-[104px] lg:text-[124px]" style={{ "--i": 1 } as React.CSSProperties}>
              It doesn&apos;t just
              <br />
              answer.
              <br />
              <span className="text-ink-3">It helps you learn.</span>
            </h1>
          </div>

          <div className="animate-rise mt-2 md:col-span-7" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="max-w-xl text-[19px] leading-snug text-ink md:text-[24px]">
              Upload your notes. ZtudyLock understands them, teaches you from them, tests you, finds what&apos;s weak and adapts what you study next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <LinkButton href={start} variant="primary" size="lg">
                {onboarded ? "Continue learning" : "Set up your workspace"} <IconArrowUpRight size={16} />
              </LinkButton>
              <BracketLink href="#how">How it works</BracketLink>
            </div>
          </div>
          <div className="animate-rise mt-2 md:col-span-4 md:col-start-9" style={{ "--i": 4 } as React.CSSProperties}>
            <p className="label mb-3">The loop</p>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2">
              {LOOP.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={i === 0 ? "text-ink" : ""}>{step}</span>
                  {i < LOOP.length - 1 && <span className="text-ink-4" aria-hidden="true">→</span>}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">Free to run on Gemini&apos;s free tier. Your material stays in your browser.</p>
          </div>
        </section>

        {/* Product glimpse: typography-only mock of the Home screen. */}
        <section className="relative pb-20 md:pb-28" aria-label="Preview">
          <div className="light-orb -top-24 left-[8%] size-[420px]" aria-hidden="true" />
          <div className="light-orb -bottom-20 right-[5%] size-[360px] opacity-70" aria-hidden="true" />
          <div className="glass-panel animate-scale-in relative overflow-hidden">
            <div className="grid grid-cols-1 gap-10 p-6 md:grid-cols-12 md:p-12">
              <div className="md:col-span-5">
                <p className="label">Home · Tonight</p>
                <p className="display mt-4 text-[32px] text-ink md:text-[44px]">Good evening.</p>
                <p className="mt-2 text-[16px] text-ink-3">You have 42 minutes planned today.</p>
                <div className="mt-8 flex flex-col gap-3 text-[14px]">
                  {[
                    ["20 min", "Learn", "Deadlocks"],
                    ["10 min", "Flashcards", "12 cards due"],
                    ["12 min", "Revise", "Database normalisation"],
                  ].map(([t, k, n]) => (
                    <div key={k} className="flex items-baseline gap-4 border-t border-line pt-3">
                      <span className="mono w-14 text-[12px] text-ink-3">{t}</span>
                      <span className="w-24 text-ink-2">{k}</span>
                      <span className="text-ink">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-6 md:col-start-7">
                <p className="label">Concept mastery · Operating Systems</p>
                <ul className="mt-5 flex flex-col gap-4">
                  {[
                    ["Processes", 91],
                    ["Scheduling", 84],
                    ["Memory", 78],
                    ["Deadlocks", 43],
                  ].map(([name, v]) => (
                    <li key={String(name)}>
                      <div className="mb-2 flex items-baseline justify-between text-[14px]">
                        <span className="text-ink">{name}</span>
                        <span className="mono text-[12px] text-ink-3">{v}%</span>
                      </div>
                      <div className={cx("meter", Number(v) < 50 && "is-warn")}>
                        <span style={{ width: `${v}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[14px] text-ink-2">
                  Your strongest area is Processes. <span className="text-ink-3">Deadlocks needs another pass.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section id="what" className="scroll-mt-20 border-t border-line py-16 md:py-24">
          <h2 className="display text-[34px] text-ink md:text-[48px]">Not another chatbot.</h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-3">Chat is one tool inside a learning system. The system is the product.</p>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
            {PILLARS.map((h) => (
              <div key={h.n} className="md:border-l md:border-line md:px-8 first:md:border-l-0 first:md:pl-0">
                <p className="display text-[44px] text-ink/15">{h.n}</p>
                <h3 className="mt-8 text-[17px] text-ink">{h.title}</h3>
                <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-ink-3">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 grid grid-cols-1 gap-10 border-t border-line py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-5">
            <h2 className="display text-[34px] text-ink md:text-[48px]">
              From a PDF
              <br />
              to mastery
            </h2>
            <p className="mt-6 max-w-sm text-[13.5px] leading-relaxed text-ink-3">Five minutes from first visit to first concept. Everything ZtudyLock learns about you stays visible and editable.</p>
          </div>
          <ul className="md:col-span-6 md:col-start-7">
            {PROCESS.map((p, i) => {
              const isOpen = open === i;
              return (
                <li key={p.n} className="border-t border-line last:border-b">
                  <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="group flex w-full items-center justify-between gap-4 py-5 text-left">
                    <span className="flex items-baseline gap-4">
                      <span className="mono text-[13px] text-ink-3">{p.n}</span>
                      <span className="text-[17px] text-ink">{p.title}</span>
                    </span>
                    <span className="relative block size-3 text-ink-3 transition-colors group-hover:text-ink" aria-hidden="true">
                      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                      <span className={cx("absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300", isOpen ? "scale-y-0" : "scale-y-100")} />
                    </span>
                  </button>
                  <div className={cx("grid transition-[grid-template-rows] duration-300", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                      <p className="max-w-md pb-6 pl-10 text-[13.5px] leading-relaxed text-ink-3">{p.body}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Closing */}
        <section className="grid grid-cols-1 gap-8 border-t border-line py-20 md:grid-cols-12 md:items-end md:py-28">
          <h2 className="display text-[40px] text-ink sm:text-[56px] md:col-span-9 md:text-[72px]">
            Ready when
            <br />
            you are.
          </h2>
          <div className="md:col-span-3 md:flex md:justify-end">
            <LinkButton href={start} variant="primary" size="lg">
              {onboarded ? "Open workspace" : "Start learning"} <IconArrowUpRight size={16} />
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-col gap-4 border-t border-line px-5 py-6 text-[12px] text-ink-3 md:flex-row md:items-center md:justify-between md:px-10">
        <p>
          © {new Date().getFullYear()} ZtudyLock · A product by{" "}
          <a href={AUTHOR.site} target="_blank" rel="noreferrer" className="link-underline text-ink">
            {AUTHOR.handle} ↗
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href={AUTHOR.linkedin} target="_blank" rel="noreferrer" className="link-underline hover:text-ink">LinkedIn</a>
          <a href={AUTHOR.github} target="_blank" rel="noreferrer" className="link-underline hover:text-ink">GitHub</a>
          <a href={`mailto:${AUTHOR.email}`} className="link-underline hover:text-ink">Email</a>
          <Link href="#" className="link-underline hover:text-ink">Back to top ↑</Link>
        </div>
      </footer>
    </div>
  );
}
