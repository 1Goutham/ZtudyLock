/**
 * Domain model for ZtudyLock.
 *
 * Storage-agnostic on purpose: every entity carries an `id` and timestamps so
 * the same shapes can move from browser storage to a database + auth session
 * (see `lib/storage`) without reshaping the UI.
 */

/** The student. Local-only for now; maps 1:1 to an auth user later. */
export interface Profile {
  id: string;
  name: string;
  /** What they are studying: "Computer Science, 3rd year", "CBSE Class 12". */
  studying: string;
  /** What they are preparing for: "End-semester exams", "GATE 2027". */
  preparingFor: string;
  /** ISO date (yyyy-mm-dd) or null when there is no fixed date. */
  examDate: string | null;
  /** Minutes the student wants to study per day. */
  dailyMinutes: number;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentKind = "notes" | "textbook" | "slides" | "question-paper" | "syllabus" | "other";
export type DocumentSource = "upload" | "paste" | "image";
export type DocumentStatus = "ready" | "understanding" | "understood" | "failed";

/** A passage of a document. Retrieval and concept extraction work on these. */
export interface Chunk {
  id: string;
  index: number;
  heading: string | null;
  text: string;
}

export interface StudyDocument {
  id: string;
  subjectId: string;
  name: string;
  kind: DocumentKind;
  source: DocumentSource;
  pages: number | null;
  chars: number;
  chunks: Chunk[];
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
  understoodAt: string | null;
}

export type ConceptImportance = "core" | "supporting";

/** A learnable unit extracted from the student's material. */
export interface Concept {
  id: string;
  subjectId: string;
  name: string;
  summary: string;
  definition: string | null;
  importance: ConceptImportance;
  chapter: string | null;
  sourceDocIds: string[];
  sourceChunkIds: string[];
  /** Names of related concepts (same subject). */
  related: string[];
  createdAt: string;
}

export type PracticeMode = "quiz" | "flashcards" | "mock" | "revision";
export type CardRating = "again" | "hard" | "good" | "easy";
export type Difficulty = "easy" | "medium" | "hard";

/** One answered question or one rated card. The raw material of mastery. */
export interface Attempt {
  id: string;
  subjectId: string;
  conceptId: string;
  mode: PracticeMode;
  correct: boolean;
  rating: CardRating | null;
  questionId: string | null;
  /** The prompt, kept so the tutor can reference recent mistakes. */
  prompt: string | null;
  at: string;
}

export interface Question {
  id: string;
  subjectId: string;
  conceptId: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  conceptId: string;
  front: string;
  back: string;
  createdAt: string;
}

/** SM-2 state for a flashcard. */
export interface CardSchedule {
  cardId: string;
  ease: number;
  intervalDays: number;
  due: string;
  reps: number;
  lapses: number;
  lastRating: CardRating | null;
}

export type SessionKind = "learn" | "ask" | "quiz" | "flashcards" | "mock" | "revision";

/** A block of study time. Drives "today", streaks and history. */
export interface StudySession {
  id: string;
  kind: SessionKind;
  subjectId: string | null;
  conceptId: string | null;
  minutes: number;
  at: string;
}

export interface ExamTopic {
  name: string;
  /** How many times it appears across the analysed papers. */
  mentions: number;
  /** Total marks attributed, when the papers state marks. */
  marks: number | null;
  conceptId: string | null;
}

export interface ExamInsight {
  id: string;
  subjectId: string;
  docIds: string[];
  topics: ExamTopic[];
  patterns: string[];
  marksDistribution: { label: string; marks: number }[];
  summary: string;
  analysedAt: string;
}

export type TutorIntent = "simple" | "deep" | "example" | "analogy" | "question" | "hint";

export interface ConversationMessage {
  id: string;
  role: "user" | "tutor";
  content: string;
  intent: TutorIntent | null;
  /** A short check-in question the tutor offered after explaining. */
  checkQuestion: string | null;
  at: string;
}

export interface Conversation {
  id: string;
  subjectId: string | null;
  conceptId: string | null;
  messages: ConversationMessage[];
  updatedAt: string;
}

/** Everything the workspace owns; used for hydration and export. */
export interface WorkspaceSnapshot {
  profile: Profile | null;
  subjects: Subject[];
  documents: StudyDocument[];
  concepts: Concept[];
  attempts: Attempt[];
  questions: Question[];
  flashcards: Flashcard[];
  schedules: CardSchedule[];
  sessions: StudySession[];
  examInsights: ExamInsight[];
  conversations: Conversation[];
}
