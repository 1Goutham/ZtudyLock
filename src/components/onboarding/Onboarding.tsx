"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DAILY_MINUTE_OPTIONS, DEFAULT_DAILY_MINUTES } from "@/lib/constants";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import { cx, daysUntil, firstName, nowIso, plural } from "@/lib/utils";
import { Button, Chip, ChipGroup, Field, Input, Logo } from "@/components/ui";
import { UploadFlow } from "@/components/library/UploadFlow";

const STEPS = ["You", "Goal", "Time", "Material", "Ready"] as const;

const GOALS = ["End-semester exams", "Board exams", "An entrance exam", "A certification", "Just learning"];

export function Onboarding() {
  const router = useRouter();
  const { ready, profile, subjects, concepts } = useWorkspace();
  const { saveProfile, addSubject } = useWorkspaceActions();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [studying, setStudying] = useState("");
  const [goal, setGoal] = useState("");
  const [examDate, setExamDate] = useState("");
  const [minutes, setMinutes] = useState(DEFAULT_DAILY_MINUTES);
  const [subjectName, setSubjectName] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ concepts: number; documents: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ready && profile?.onboardingCompletedAt) router.replace("/home");
  }, [ready, profile, router]);

  useEffect(() => {
    if (!ready || !profile) return;
    setName(profile.name);
    setStudying(profile.studying);
    setGoal(profile.preparingFor);
    setExamDate(profile.examDate ?? "");
    setMinutes(profile.dailyMinutes);
  }, [ready, profile]);

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (step === 0) {
      const e: Record<string, string> = {};
      if (!name.trim()) e.name = "So ZtudyLock can greet you properly.";
      if (!studying.trim()) e.studying = "A course, a class, a field. Anything.";
      setErrors(e);
      if (Object.keys(e).length) return;
      saveProfile({ name: name.trim(), studying: studying.trim() });
    }
    if (step === 1) {
      if (!goal.trim()) return setErrors({ goal: "Pick one, or write your own." });
      setErrors({});
      saveProfile({ preparingFor: goal.trim() });
    }
    if (step === 2) saveProfile({ examDate: examDate || null, dailyMinutes: minutes });
    go(step + 1);
  };

  const createSubject = () => {
    const n = subjectName.trim();
    if (!n) return toast.message("Name the subject first.");
    const s = addSubject(n);
    setSubjectId(s.id);
  };

  const finish = () => {
    saveProfile({ onboardingCompletedAt: nowIso() });
    router.push("/home");
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const days = examDate ? daysUntil(examDate) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 md:px-10">
        <Logo />
        <p className="mono text-[12px] text-ink-3">
          {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          <span className="hidden sm:inline"> · {STEPS[step]}</span>
        </p>
      </header>
      <div className="mx-auto w-full max-w-[1200px] px-5 md:px-10">
        <div className="h-px w-full bg-line">
          <div className="h-px bg-ink transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-12 md:px-10 md:py-20">
        {step === 0 && (
          <StepFrame key="you" eyebrow="Let's begin" title={<>What are you<br />studying?</>} description="ZtudyLock sets up a personal learning system around this. You can change any of it later.">
            <div className="grid gap-8">
              <Field label="Your name" error={errors.name}>{(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Goutham" />}</Field>
              <Field label="What you're studying" error={errors.studying} hint="A course, a year, a field. This shapes how the tutor pitches explanations.">
                {(id) => <Input id={id} value={studying} onChange={(e) => setStudying(e.target.value)} placeholder="B.Tech Computer Science, 3rd year" onKeyDown={(e) => e.key === "Enter" && next()} />}
              </Field>
            </div>
            <Footer rule={false}><Button variant="primary" size="lg" onClick={next}>Continue</Button></Footer>
          </StepFrame>
        )}

        {step === 1 && (
          <StepFrame key="goal" eyebrow="Your goal" title={<>What are you<br />preparing for?</>} description="ZtudyLock uses this to decide how deep to go and how to phrase practice questions.">
            <ChipGroup>
              {GOALS.map((g) => (
                <Chip key={g} selected={goal === g} onClick={() => { setGoal(g); setErrors({}); }}>{g}</Chip>
              ))}
            </ChipGroup>
            <div className="mt-8">
              <Field label="Or in your own words" optional error={errors.goal}>
                {(id) => <Input id={id} value={GOALS.includes(goal) ? "" : goal} onChange={(e) => { setGoal(e.target.value); setErrors({}); }} placeholder="GATE 2027, Computer Science" onKeyDown={(e) => e.key === "Enter" && next()} />}
              </Field>
            </div>
            <Footer onBack={() => go(0)}><Button variant="primary" size="lg" onClick={next}>Continue</Button></Footer>
          </StepFrame>
        )}

        {step === 2 && (
          <StepFrame key="time" eyebrow="Your time" title={<>When is<br />your exam?</>} description="Optional. With a date, Home shows what's realistic each day. Without one, ZtudyLock paces you by the minutes you choose.">
            <div className="grid gap-10">
              <Field label="Exam date" optional hint={days !== null ? (days >= 0 ? `${plural(days, "day")} from today.` : "That date has passed.") : undefined}>
                {(id) => <Input id={id} type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="max-w-xs" />}
              </Field>
              <div>
                <p className="mb-3 text-[14px] text-ink">Minutes a day</p>
                <ChipGroup>
                  {DAILY_MINUTE_OPTIONS.map((m) => (
                    <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)}>{m} min</Chip>
                  ))}
                </ChipGroup>
                <p className="mt-3 text-[12.5px] text-ink-3">Honest beats ambitious. The plan adapts to what you actually do.</p>
              </div>
            </div>
            <Footer onBack={() => go(1)}><Button variant="primary" size="lg" onClick={next}>Continue</Button></Footer>
          </StepFrame>
        )}

        {step === 3 && (
          <StepFrame key="material" eyebrow="Your material" title={<>Upload what<br />you&apos;re learning.</>} description="Notes, a chapter, slides, a past paper. ZtudyLock reads it in your browser and turns it into concepts. You can add more any time.">
            {!subjectId ? (
              <div>
                <Field label="First subject" hint="Start with one. Add the rest in Library.">
                  {(id) => <Input id={id} autoFocus value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Operating Systems" onKeyDown={(e) => e.key === "Enter" && createSubject()} />}
                </Field>
                <Footer onBack={() => go(2)}>
                  <button type="button" onClick={() => go(4)} className="link-underline text-[13.5px] text-ink-3 hover:text-ink">Skip for now</button>
                  <Button variant="primary" size="lg" onClick={createSubject}>Continue</Button>
                </Footer>
              </div>
            ) : uploaded ? (
              <div className="animate-rise">
                <p className="text-[20px] text-ink">{uploaded.concepts ? `${plural(uploaded.concepts, "concept")} found in ${plural(uploaded.documents, "document")}.` : "Material added."}</p>
                <p className="mt-2 text-[14px] text-ink-3">You&apos;ll find them under {subjects.find((s) => s.id === subjectId)?.name} in your Library.</p>
                <Footer rule={false}>
                  <button type="button" onClick={() => setUploaded(null)} className="link-underline text-[13.5px] text-ink-3 hover:text-ink">Add more</button>
                  <Button variant="primary" size="lg" onClick={() => go(4)}>Continue</Button>
                </Footer>
              </div>
            ) : (
              <div>
                <p className="label mb-4">{subjects.find((s) => s.id === subjectId)?.name}</p>
                <UploadFlow subjectId={subjectId} compact onDone={setUploaded} />
                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={() => go(4)} className="link-underline text-[13.5px] text-ink-3 hover:text-ink">Skip for now</button>
                </div>
              </div>
            )}
          </StepFrame>
        )}

        {step === 4 && (
          <StepFrame key="ready" eyebrow="All set" title={<>You&apos;re<br />ready{name ? `, ${firstName(name)}` : ""}.</>} description="Your workspace is set up. Home shows what to do today; Library holds your material; Learn, Practice and Progress do the rest.">
            <ul className="border-t border-line">
              {[
                ["Studying", studying],
                ["Preparing for", goal],
                ["Exam", examDate ? `${examDate}${days !== null && days >= 0 ? ` · ${plural(days, "day")} away` : ""}` : "No fixed date"],
                ["Daily", `${minutes} minutes`],
                ["Material", concepts.length ? `${plural(concepts.length, "concept")} across ${plural(subjects.length, "subject")}` : "Nothing yet · add it in Library"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5 text-[14.5px]">
                  <span className="text-ink-3">{k}</span>
                  <span className="text-right text-ink">{v}</span>
                </li>
              ))}
            </ul>
            <Footer onBack={() => go(3)}>
              <Button variant="primary" size="lg" onClick={finish}>Open ZtudyLock</Button>
            </Footer>
          </StepFrame>
        )}
      </main>
    </div>
  );
}

function StepFrame({ eyebrow, title, description, children }: { eyebrow: string; title: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-10 md:grid-cols-12 md:gap-x-10">
      <div className="md:col-span-5">
        <p className="label mb-4 animate-rise">{eyebrow}</p>
        <h1 className="display animate-rise text-[40px] text-ink sm:text-[52px] md:text-[64px]" style={{ "--i": 1 } as React.CSSProperties}>{title}</h1>
        <p className="mt-6 max-w-sm animate-rise text-[14px] leading-relaxed text-ink-3" style={{ "--i": 2 } as React.CSSProperties}>{description}</p>
      </div>
      <div className="animate-rise md:col-span-6 md:col-start-7" style={{ "--i": 3 } as React.CSSProperties}>{children}</div>
    </div>
  );
}

function Footer({ onBack, rule = true, children }: { onBack?: () => void; rule?: boolean; children: React.ReactNode }) {
  return (
    <div className={cx("mt-8 flex items-center justify-between gap-4", rule && "mt-12 border-t border-line pt-6")}>
      {onBack ? (
        <button type="button" onClick={onBack} className="bracket text-[13px] text-ink-2 hover:text-ink">
          <span className="bracket-l" aria-hidden="true">[</span>Back<span className="bracket-r" aria-hidden="true">]</span>
        </button>
      ) : (
        <Link href="/" className="bracket text-[13px] text-ink-2 hover:text-ink">
          <span className="bracket-l" aria-hidden="true">[</span>Cancel<span className="bracket-r" aria-hidden="true">]</span>
        </Link>
      )}
      <div className="flex items-center gap-5">{children}</div>
    </div>
  );
}
