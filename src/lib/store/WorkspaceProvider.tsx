"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { repository, StorageFullError } from "../storage";
import type {
  Attempt,
  CardRating,
  CardSchedule,
  Concept,
  Conversation,
  ConversationMessage,
  ExamInsight,
  Flashcard,
  PracticeMode,
  Profile,
  Question,
  SessionKind,
  StudyDocument,
  Subject,
  WorkspaceSnapshot,
} from "../types";
import { newSchedule, rate } from "../learning/scheduler";
import { nowIso, uid } from "../utils";

/**
 * Single source of truth for the workspace. Components read state from here
 * and mutate it through typed actions; every mutation is written through to
 * the repository, so the UI never knows where data lives.
 */

export interface WorkspaceState extends WorkspaceSnapshot {
  /** True once the repository has been read on the client. */
  ready: boolean;
}

export interface WorkspaceActions {
  saveProfile(input: Partial<Profile>): Profile;

  addSubject(name: string): Subject;
  renameSubject(id: string, name: string): void;
  removeSubject(id: string): void;

  addDocument(input: Omit<StudyDocument, "id" | "createdAt" | "understoodAt">): StudyDocument;
  updateDocument(id: string, patch: Partial<StudyDocument>): void;
  removeDocument(id: string): void;

  addConcepts(concepts: Omit<Concept, "id" | "createdAt">[]): Concept[];
  updateConcept(id: string, patch: Partial<Concept>): void;
  removeConcepts(ids: string[]): void;

  recordAttempt(input: {
    subjectId: string;
    conceptId: string;
    mode: PracticeMode;
    correct: boolean;
    rating?: CardRating | null;
    questionId?: string | null;
    prompt?: string | null;
  }): Attempt;
  cacheQuestions(questions: Omit<Question, "id" | "createdAt">[]): Question[];
  cacheFlashcards(cards: Omit<Flashcard, "id" | "createdAt">[]): Flashcard[];
  rateCard(cardId: string, rating: CardRating): CardSchedule;
  logSession(input: { kind: SessionKind; subjectId?: string | null; conceptId?: string | null; minutes: number }): void;
  saveExamInsight(insight: Omit<ExamInsight, "id" | "analysedAt">): ExamInsight;

  getConversation(subjectId: string | null, conceptId: string | null): Conversation;
  appendMessage(conversationId: string, message: Omit<ConversationMessage, "id" | "at">): ConversationMessage;
  clearConversation(conversationId: string): void;

  exportSnapshot(): WorkspaceSnapshot;
  resetWorkspace(): Promise<void>;
}

const StateCtx = createContext<WorkspaceState | null>(null);
const ActionsCtx = createContext<WorkspaceActions | null>(null);

const EMPTY: WorkspaceState = {
  ready: false,
  profile: null,
  subjects: [],
  documents: [],
  concepts: [],
  attempts: [],
  questions: [],
  flashcards: [],
  schedules: [],
  sessions: [],
  examInsights: [],
  conversations: [],
};

function persist(op: () => Promise<void>) {
  op().catch((e) => {
    if (e instanceof StorageFullError) toast.error(e.message);
    else console.error("ZtudyLock: persistence failed", e);
  });
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Apply an update to the ref synchronously as well, so actions called back to back in one tick see each other's results. */
  const commit = useCallback((updater: (s: WorkspaceState) => WorkspaceState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    repository.load().then((snap) => {
      if (!cancelled) setState({ ...snap, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo<WorkspaceActions>(() => {
    const saveProfile: WorkspaceActions["saveProfile"] = (input) => {
      const prev = stateRef.current.profile;
      const profile: Profile = {
        id: prev?.id ?? uid("stu"),
        name: "",
        studying: "",
        preparingFor: "",
        examDate: null,
        dailyMinutes: 45,
        onboardingCompletedAt: null,
        createdAt: prev?.createdAt ?? nowIso(),
        ...prev,
        ...input,
        updatedAt: nowIso(),
      };
      commit((s) => ({ ...s, profile }));
      persist(() => repository.saveProfile(profile));
      return profile;
    };

    const addSubject: WorkspaceActions["addSubject"] = (name) => {
      const ts = nowIso();
      const subject: Subject = { id: uid("sub"), name: name.trim(), createdAt: ts, updatedAt: ts };
      commit((s) => ({ ...s, subjects: [...s.subjects, subject] }));
      persist(() => repository.upsertSubject(subject));
      return subject;
    };
    const renameSubject: WorkspaceActions["renameSubject"] = (id, name) => {
      const cur = stateRef.current.subjects.find((s) => s.id === id);
      if (!cur) return;
      const next = { ...cur, name: name.trim(), updatedAt: nowIso() };
      commit((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? next : x)) }));
      persist(() => repository.upsertSubject(next));
    };
    const removeSubject: WorkspaceActions["removeSubject"] = (id) => {
      commit((s) => ({
        ...s,
        subjects: s.subjects.filter((x) => x.id !== id),
        documents: s.documents.filter((x) => x.subjectId !== id),
        concepts: s.concepts.filter((x) => x.subjectId !== id),
        questions: s.questions.filter((x) => x.subjectId !== id),
        flashcards: s.flashcards.filter((x) => x.subjectId !== id),
        examInsights: s.examInsights.filter((x) => x.subjectId !== id),
      }));
      persist(() => repository.deleteSubject(id));
    };

    const addDocument: WorkspaceActions["addDocument"] = (input) => {
      const doc: StudyDocument = { ...input, id: uid("doc"), createdAt: nowIso(), understoodAt: null };
      commit((s) => ({ ...s, documents: [doc, ...s.documents] }));
      persist(() => repository.upsertDocument(doc));
      return doc;
    };
    const updateDocument: WorkspaceActions["updateDocument"] = (id, patch) => {
      const cur = stateRef.current.documents.find((d) => d.id === id);
      if (!cur) return;
      const next = { ...cur, ...patch };
      commit((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? next : d)) }));
      persist(() => repository.upsertDocument(next));
    };
    const removeDocument: WorkspaceActions["removeDocument"] = (id) => {
      commit((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
      persist(() => repository.deleteDocument(id));
    };

    const addConcepts: WorkspaceActions["addConcepts"] = (inputs) => {
      const ts = nowIso();
      const concepts = inputs.map((c) => ({ ...c, id: uid("con"), createdAt: ts }));
      commit((s) => ({ ...s, concepts: [...s.concepts, ...concepts] }));
      persist(() => repository.upsertConcepts(concepts));
      return concepts;
    };
    const updateConcept: WorkspaceActions["updateConcept"] = (id, patch) => {
      const cur = stateRef.current.concepts.find((c) => c.id === id);
      if (!cur) return;
      const next = { ...cur, ...patch };
      commit((s) => ({ ...s, concepts: s.concepts.map((c) => (c.id === id ? next : c)) }));
      persist(() => repository.upsertConcepts([next]));
    };
    const removeConcepts: WorkspaceActions["removeConcepts"] = (ids) => {
      const set = new Set(ids);
      commit((s) => ({ ...s, concepts: s.concepts.filter((c) => !set.has(c.id)) }));
      persist(() => repository.deleteConcepts(ids));
    };

    const recordAttempt: WorkspaceActions["recordAttempt"] = (input) => {
      const attempt: Attempt = {
        id: uid("att"),
        subjectId: input.subjectId,
        conceptId: input.conceptId,
        mode: input.mode,
        correct: input.correct,
        rating: input.rating ?? null,
        questionId: input.questionId ?? null,
        prompt: input.prompt ?? null,
        at: nowIso(),
      };
      commit((s) => ({ ...s, attempts: [...s.attempts, attempt] }));
      persist(() => repository.addAttempt(attempt));
      return attempt;
    };
    const cacheQuestions: WorkspaceActions["cacheQuestions"] = (inputs) => {
      const ts = nowIso();
      const questions = inputs.map((q) => ({ ...q, id: uid("q"), createdAt: ts }));
      commit((s) => ({ ...s, questions: [...s.questions, ...questions] }));
      persist(() => repository.upsertQuestions(questions));
      return questions;
    };
    const cacheFlashcards: WorkspaceActions["cacheFlashcards"] = (inputs) => {
      const ts = nowIso();
      const cards = inputs.map((c) => ({ ...c, id: uid("card"), createdAt: ts }));
      commit((s) => ({ ...s, flashcards: [...s.flashcards, ...cards] }));
      persist(() => repository.upsertFlashcards(cards));
      return cards;
    };
    const rateCard: WorkspaceActions["rateCard"] = (cardId, rating) => {
      const prev = stateRef.current.schedules.find((s) => s.cardId === cardId) ?? newSchedule(cardId);
      const next = rate(prev, rating);
      commit((s) => ({
        ...s,
        schedules: s.schedules.some((x) => x.cardId === cardId) ? s.schedules.map((x) => (x.cardId === cardId ? next : x)) : [...s.schedules, next],
      }));
      persist(() => repository.upsertSchedule(next));
      return next;
    };
    const logSession: WorkspaceActions["logSession"] = ({ kind, subjectId = null, conceptId = null, minutes }) => {
      if (minutes <= 0) return;
      const session = { id: uid("ses"), kind, subjectId, conceptId, minutes: Math.round(minutes), at: nowIso() };
      commit((s) => ({ ...s, sessions: [...s.sessions, session] }));
      persist(() => repository.addSession(session));
    };
    const saveExamInsight: WorkspaceActions["saveExamInsight"] = (input) => {
      const insight: ExamInsight = { ...input, id: uid("exam"), analysedAt: nowIso() };
      commit((s) => ({ ...s, examInsights: [insight, ...s.examInsights.filter((e) => e.subjectId !== insight.subjectId)] }));
      persist(() => repository.upsertExamInsight(insight));
      return insight;
    };

    const getConversation: WorkspaceActions["getConversation"] = (subjectId, conceptId) => {
      const found = stateRef.current.conversations.find((c) => c.subjectId === subjectId && c.conceptId === conceptId);
      if (found) return found;
      const conv: Conversation = { id: uid("cnv"), subjectId, conceptId, messages: [], updatedAt: nowIso() };
      commit((s) => ({ ...s, conversations: [conv, ...s.conversations] }));
      persist(() => repository.upsertConversation(conv));
      return conv;
    };
    const appendMessage: WorkspaceActions["appendMessage"] = (conversationId, message) => {
      const msg: ConversationMessage = { ...message, id: uid("msg"), at: nowIso() };
      const cur = stateRef.current.conversations.find((c) => c.id === conversationId);
      if (!cur) return msg;
      const next: Conversation = { ...cur, messages: [...cur.messages, msg].slice(-60), updatedAt: msg.at };
      commit((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === conversationId ? next : c)) }));
      persist(() => repository.upsertConversation(next));
      return msg;
    };
    const clearConversation: WorkspaceActions["clearConversation"] = (conversationId) => {
      const cur = stateRef.current.conversations.find((c) => c.id === conversationId);
      if (!cur) return;
      const next: Conversation = { ...cur, messages: [], updatedAt: nowIso() };
      commit((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === conversationId ? next : c)) }));
      persist(() => repository.upsertConversation(next));
    };

    const exportSnapshot: WorkspaceActions["exportSnapshot"] = () => {
      const { ready: _ready, ...snap } = stateRef.current;
      void _ready;
      return snap;
    };
    const resetWorkspace: WorkspaceActions["resetWorkspace"] = async () => {
      await repository.clearAll();
      commit(() => ({ ...EMPTY, ready: true }));
    };

    return {
      saveProfile,
      addSubject,
      renameSubject,
      removeSubject,
      addDocument,
      updateDocument,
      removeDocument,
      addConcepts,
      updateConcept,
      removeConcepts,
      recordAttempt,
      cacheQuestions,
      cacheFlashcards,
      rateCard,
      logSession,
      saveExamInsight,
      getConversation,
      appendMessage,
      clearConversation,
      exportSnapshot,
      resetWorkspace,
    };
  }, [commit]);

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function useWorkspaceActions(): WorkspaceActions {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useWorkspaceActions must be used inside WorkspaceProvider");
  return ctx;
}
