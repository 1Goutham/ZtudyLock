import { MAX_ATTEMPTS, MAX_SESSIONS } from "../constants";
import type {
  Attempt,
  CardSchedule,
  Concept,
  Conversation,
  ExamInsight,
  Flashcard,
  Profile,
  Question,
  StudyDocument,
  StudySession,
  Subject,
  WorkspaceSnapshot,
} from "../types";
import type { StudyRepository } from "./repository";

const NS = "ztudylock:v1";
const KEYS = {
  profile: `${NS}:profile`,
  subjects: `${NS}:subjects`,
  documents: `${NS}:documents`,
  concepts: `${NS}:concepts`,
  attempts: `${NS}:attempts`,
  questions: `${NS}:questions`,
  flashcards: `${NS}:flashcards`,
  schedules: `${NS}:schedules`,
  sessions: `${NS}:sessions`,
  examInsights: `${NS}:examInsights`,
  conversations: `${NS}:conversations`,
} as const;

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function read<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export class StorageFullError extends Error {
  constructor() {
    super("This browser's storage is full. Remove a document you no longer need, or export your workspace.");
    this.name = "StorageFullError";
  }
}

function write(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("ZtudyLock: could not persist", key, err);
    throw new StorageFullError();
  }
}

function upsertList<T extends { id: string }>(key: string, items: T[], front = false): void {
  const list = read<T[]>(key, []);
  for (const item of items) {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else if (front) list.unshift(item);
    else list.push(item);
  }
  write(key, list);
}

function removeFrom<T extends { id: string }>(key: string, pred: (x: T) => boolean): void {
  write(key, read<T[]>(key, []).filter((x) => !pred(x)));
}

/** Browser-local persistence. Everything lives on this device. */
export class LocalRepository implements StudyRepository {
  async load(): Promise<WorkspaceSnapshot> {
    return {
      profile: read<Profile | null>(KEYS.profile, null),
      subjects: read<Subject[]>(KEYS.subjects, []),
      documents: read<StudyDocument[]>(KEYS.documents, []),
      concepts: read<Concept[]>(KEYS.concepts, []),
      attempts: read<Attempt[]>(KEYS.attempts, []),
      questions: read<Question[]>(KEYS.questions, []),
      flashcards: read<Flashcard[]>(KEYS.flashcards, []),
      schedules: read<CardSchedule[]>(KEYS.schedules, []),
      sessions: read<StudySession[]>(KEYS.sessions, []),
      examInsights: read<ExamInsight[]>(KEYS.examInsights, []),
      conversations: read<Conversation[]>(KEYS.conversations, []),
    };
  }

  async saveProfile(profile: Profile) {
    write(KEYS.profile, profile);
  }

  async upsertSubject(subject: Subject) {
    upsertList(KEYS.subjects, [subject]);
  }
  async deleteSubject(id: string) {
    removeFrom<Subject>(KEYS.subjects, (s) => s.id === id);
    removeFrom<StudyDocument>(KEYS.documents, (d) => d.subjectId === id);
    removeFrom<Concept>(KEYS.concepts, (c) => c.subjectId === id);
    removeFrom<Question>(KEYS.questions, (q) => q.subjectId === id);
    removeFrom<Flashcard>(KEYS.flashcards, (f) => f.subjectId === id);
    removeFrom<ExamInsight>(KEYS.examInsights, (e) => e.subjectId === id);
  }

  async upsertDocument(doc: StudyDocument) {
    upsertList(KEYS.documents, [doc], true);
  }
  async deleteDocument(id: string) {
    removeFrom<StudyDocument>(KEYS.documents, (d) => d.id === id);
  }

  async upsertConcepts(concepts: Concept[]) {
    upsertList(KEYS.concepts, concepts);
  }
  async deleteConcepts(ids: string[]) {
    const set = new Set(ids);
    removeFrom<Concept>(KEYS.concepts, (c) => set.has(c.id));
  }

  async addAttempt(attempt: Attempt) {
    const list = read<Attempt[]>(KEYS.attempts, []);
    list.push(attempt);
    write(KEYS.attempts, list.slice(-MAX_ATTEMPTS));
  }
  async upsertQuestions(questions: Question[]) {
    upsertList(KEYS.questions, questions);
  }
  async upsertFlashcards(cards: Flashcard[]) {
    upsertList(KEYS.flashcards, cards);
  }
  async upsertSchedule(schedule: CardSchedule) {
    const list = read<CardSchedule[]>(KEYS.schedules, []);
    const idx = list.findIndex((s) => s.cardId === schedule.cardId);
    if (idx >= 0) list[idx] = schedule;
    else list.push(schedule);
    write(KEYS.schedules, list);
  }
  async addSession(session: StudySession) {
    const list = read<StudySession[]>(KEYS.sessions, []);
    list.push(session);
    write(KEYS.sessions, list.slice(-MAX_SESSIONS));
  }
  async upsertExamInsight(insight: ExamInsight) {
    upsertList(KEYS.examInsights, [insight], true);
  }
  async upsertConversation(conversation: Conversation) {
    const list = read<Conversation[]>(KEYS.conversations, []);
    const idx = list.findIndex((c) => c.id === conversation.id);
    if (idx >= 0) list[idx] = conversation;
    else list.unshift(conversation);
    write(KEYS.conversations, list.slice(0, 40));
  }

  async clearAll() {
    if (!canUseStorage()) return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  }
}

export const repository: StudyRepository = new LocalRepository();
