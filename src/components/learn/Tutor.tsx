"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ai, buildBrief, toPassagePayload } from "@/lib/ai/client";
import type { AiError } from "@/lib/ai/contracts";
import { TUTOR_INTENTS } from "@/lib/constants";
import { retrieve } from "@/lib/learning/retrieval";
import { useWorkspace, useWorkspaceActions } from "@/lib/store";
import type { Concept, Subject, TutorIntent } from "@/lib/types";
import { cx } from "@/lib/utils";
import { BracketLink, IconArrowUp, Markdown, TextAction, ThinkingDots } from "@/components/ui";

/**
 * The tutor. A conversation grounded in the student's material: every turn
 * carries the learning brief (subject, concept, mastery, recent mistakes) and
 * the best-matching passages from their documents. Never the whole document.
 */
export function Tutor({ subject, concept, placeholder, className }: { subject: Subject | null; concept: Concept | null; placeholder?: string; className?: string }) {
  const { profile, documents, attempts, conversations } = useWorkspace();
  const { getConversation, appendMessage, clearConversation } = useWorkspaceActions();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<TutorIntent | "message" | null>(null);
  const [error, setError] = useState<AiError | null>(null);
  const [lastSend, setLastSend] = useState<{ message: string; intent: TutorIntent | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abort = useRef<AbortController | null>(null);

  const subjectId = subject?.id ?? null;
  const conceptId = concept?.id ?? null;
  const conversation = useMemo(() => conversations.find((c) => c.subjectId === subjectId && c.conceptId === conceptId) ?? null, [conversations, subjectId, conceptId]);
  const messages = conversation?.messages ?? [];
  const subjectDocs = useMemo(() => documents.filter((d) => !subjectId || d.subjectId === subjectId), [documents, subjectId]);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, busy]);

  useEffect(() => () => abort.current?.abort(), []);

  const send = async (raw: string, intent: TutorIntent | null) => {
    const message = raw.trim() || (intent ? TUTOR_INTENTS.find((i) => i.key === intent)!.prompt : "");
    if (!message || busy) return;
    const conv = conversation ?? getConversation(subjectId, conceptId);
    appendMessage(conv.id, { role: "user", content: message, intent, checkQuestion: null });
    setInput("");
    setError(null);
    setLastSend({ message, intent });
    setBusy(intent ?? "message");

    const controller = new AbortController();
    abort.current = controller;
    const passages = retrieve(subjectDocs, `${concept?.name ?? ""} ${message}`, { limit: 4, charBudget: 5_000, preferChunkIds: concept?.sourceChunkIds ?? [] });
    const res = await ai.tutor(
      {
        brief: buildBrief(profile, subject, concept, attempts),
        intent,
        message,
        history: [...messages].slice(-8).map((m) => ({ role: m.role, content: m.content })),
        passages: toPassagePayload(passages),
      },
      controller.signal,
    );
    abort.current = null;
    setBusy(null);
    if (!res.ok) {
      if (res.error.message !== "Cancelled.") setError(res.error);
      return;
    }
    appendMessage(conv.id, { role: "tutor", content: res.data.reply, intent, checkQuestion: res.data.checkQuestion });
  };

  const lastTutor = [...messages].reverse().find((m) => m.role === "tutor") ?? null;
  const showTestMe = !!concept && !!lastTutor && messages[messages.length - 1]?.role === "tutor" && !busy;

  return (
    <div className={cx("flex flex-col", className)}>
      {/* Transcript */}
      <div className="flex flex-1 flex-col gap-8">
        {messages.length === 0 && !busy && (
          <p className="text-[20px] text-ink md:text-[24px]">
            {concept ? "What would you like to understand?" : placeholder ?? "Ask your material anything."}
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end animate-fade">
              <p className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-white/7 px-4 py-2.5 text-[15px] leading-relaxed text-ink">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="animate-rise">
              <Markdown>{m.content}</Markdown>
              {m.checkQuestion && m.id === lastTutor?.id && !busy && (
                <div className="glass-panel mt-5 px-5 py-4">
                  <p className="label mb-2">Quick check</p>
                  <p className="text-[15px] text-ink">{m.checkQuestion}</p>
                  <div className="mt-3">
                    <TextAction onClick={() => { setInput(""); inputRef.current?.focus(); }}>Answer below</TextAction>
                  </div>
                </div>
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3 text-[13px] text-ink-3 animate-fade">
            <ThinkingDots className="text-ink-3" />
            {busy === "message" ? "Reading your material" : TUTOR_INTENTS.find((i) => i.key === busy)?.label}
          </div>
        )}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 animate-fade">
            <p className="text-[13.5px] text-danger">{error.message}</p>
            {error.retryable && lastSend && <TextAction onClick={() => send(lastSend.message, lastSend.intent)}>Retry</TextAction>}
          </div>
        )}
        {showTestMe && (
          <div className="flex items-center gap-5 border-t border-line pt-5 animate-fade">
            <span className="text-[15px] text-ink">Got it?</span>
            <BracketLink href={`/practice/quiz?concept=${concept!.id}`}>Test me</BracketLink>
            <BracketLink href={`/practice/flashcards?concept=${concept!.id}`}>Flashcards</BracketLink>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer: floating glass bar. */}
      <div className="sticky bottom-20 z-10 mt-auto pt-10 md:bottom-6">
        <div className="glass-float rounded-[26px] p-2">
          <div className="flex flex-wrap gap-x-1 gap-y-0 px-2 pt-1">
            {TUTOR_INTENTS.map((i) => (
              <TextAction key={i.key} onClick={() => send(input, i.key)} disabled={!!busy} className="text-[12px]">
                {i.label}
              </TextAction>
            ))}
            {messages.length > 0 && conversation && (
              <TextAction onClick={() => clearConversation(conversation.id)} disabled={!!busy} className="ml-auto text-[12px] text-ink-4">
                Clear
              </TextAction>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input, null); }}
            className="flex items-end gap-2 px-2 pb-1"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, null); } }}
              rows={1}
              placeholder={concept ? `Ask about ${concept.name}…` : placeholder ?? "Ask your material…"}
              aria-label="Message the tutor"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
              style={{ height: "auto" }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(160, t.scrollHeight)}px`; }}
            />
            <button type="submit" disabled={!!busy || !input.trim()} aria-label="Send" className="press flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[#050505] disabled:opacity-30">
              <IconArrowUp size={16} />
            </button>
          </form>
        </div>
        <p className="mt-2 px-3 text-center text-[11.5px] text-ink-4">Answers are grounded in {subject ? `your ${subject.name} material` : "your material"}. It can still be wrong; check what matters.</p>
      </div>
    </div>
  );
}
