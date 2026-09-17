"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ai } from "@/lib/ai/client";
import type { EngineStatus } from "@/lib/ai/contracts";
import { DAILY_MINUTE_OPTIONS } from "@/lib/constants";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import { plural } from "@/lib/utils";
import { Button, Chip, ChipGroup, Field, Input, TextAction } from "@/components/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";

export function SettingsView() {
  const router = useRouter();
  const { profile, subjects, documents, concepts, attempts } = useWorkspace();
  const { saveProfile, exportSnapshot, resetWorkspace } = useWorkspaceActions();
  const [name, setName] = useState(profile?.name ?? "");
  const [studying, setStudying] = useState(profile?.studying ?? "");
  const [goal, setGoal] = useState(profile?.preparingFor ?? "");
  const [examDate, setExamDate] = useState(profile?.examDate ?? "");
  const [minutes, setMinutes] = useState(profile?.dailyMinutes ?? 45);
  const [engine, setEngine] = useState<EngineStatus | null | "error">(null);

  useEffect(() => {
    ai.engine().then((r) => setEngine(r.ok ? r.data : "error"));
  }, []);

  const dirty = !!profile && (name !== profile.name || studying !== profile.studying || goal !== profile.preparingFor || (examDate || null) !== profile.examDate || minutes !== profile.dailyMinutes);

  const save = () => {
    if (!name.trim()) return toast.message("A name, please.");
    saveProfile({ name: name.trim(), studying: studying.trim(), preparingFor: goal.trim(), examDate: examDate || null, dailyMinutes: minutes });
    toast.success("Saved.");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportSnapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ztudylock-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader index="Settings" title="You and your engine." description="Your profile shapes how the tutor pitches things. The engine is where the thinking happens." />

      <Section label="Profile" className="mb-14">
        <div className="grid gap-8 md:max-w-2xl md:grid-cols-2 md:gap-x-10">
          <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Studying">{(id) => <Input id={id} value={studying} onChange={(e) => setStudying(e.target.value)} />}</Field>
          <Field label="Preparing for">{(id) => <Input id={id} value={goal} onChange={(e) => setGoal(e.target.value)} />}</Field>
          <Field label="Exam date" optional>{(id) => <Input id={id} type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />}</Field>
        </div>
        <div className="mt-8">
          <p className="mb-3 text-[14px] text-ink">Minutes a day</p>
          <ChipGroup>
            {DAILY_MINUTE_OPTIONS.map((m) => (
              <Chip key={m} size="sm" selected={minutes === m} onClick={() => setMinutes(m)}>{m} min</Chip>
            ))}
          </ChipGroup>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <span className="mono text-[11px] text-ink-3">{dirty ? "Unsaved changes" : "Everything saved"}</span>
          <Button variant="primary" size="sm" disabled={!dirty} onClick={save}>Save</Button>
        </div>
      </Section>

      <Section label="AI engine" className="mb-14" aside={engine && engine !== "error" ? `${engine.active.length} active` : ""}>
        {engine === null ? (
          <div className="h-12 w-64 rounded animate-shimmer" />
        ) : engine === "error" ? (
          <p className="text-[14px] text-danger">Couldn&apos;t read engine status.</p>
        ) : (
          <>
            {engine.active.length === 0 && (
              <p className="mb-5 max-w-lg text-[14px] leading-relaxed text-ink-2">
                No engine is connected. Add a free <span className="mono">GEMINI_API_KEY</span> to the environment and redeploy. Reading material, the tutor and practice all need it.
              </p>
            )}
            <ul className="border-t border-line md:max-w-2xl">
              {engine.providers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 border-b border-line py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14.5px] text-ink">{p.label}{engine.active[0] === p.id && <span className="label ml-2 text-[9.5px] text-accent">primary</span>}</p>
                    <p className="mono mt-0.5 truncate text-[11px] text-ink-4">{p.configured ? (p.model ?? "model resolving") : p.note ?? "Not configured"}</p>
                  </div>
                  {p.configured ? <span className="mono text-[11px] text-accent">connected</span> : p.signupUrl ? <a href={p.signupUrl} target="_blank" rel="noreferrer" className="link-underline shrink-0 text-[12.5px] text-ink-3 hover:text-ink">Get a free key ↗</a> : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-lg text-[12.5px] leading-relaxed text-ink-3">Keys live on the server only. When one engine is rate-limited, ZtudyLock falls back to the next.</p>
          </>
        )}
      </Section>

      <Section label="Your data" aside={`${plural(subjects.length, "subject")} · ${plural(documents.length, "document")} · ${plural(concepts.length, "concept")} · ${plural(attempts.length, "attempt")}`}>
        <p className="max-w-lg text-[14px] leading-relaxed text-ink-2">Everything lives in this browser. Export a copy to keep it, or to move it. Accounts and sync come later, through the same repository interface.</p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Button size="sm" onClick={exportJson}>Export JSON</Button>
          <TextAction
            className="text-danger hover:text-danger"
            onClick={async () => {
              if (!window.confirm("Reset ZtudyLock? This removes your subjects, material, progress and profile from this browser.")) return;
              await resetWorkspace();
              toast.message("Workspace reset.");
              router.replace("/");
            }}
          >
            Reset workspace
          </TextAction>
        </div>
      </Section>
    </div>
  );
}
