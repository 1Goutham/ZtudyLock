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

/**
 * Persistence boundary. The UI only ever talks to this interface.
 * `LocalRepository` implements it on browser storage today; a Supabase
 * implementation (auth + tables mirroring `types.ts`) slots in behind the
 * same interface without touching components.
 */
export interface StudyRepository {
  load(): Promise<WorkspaceSnapshot>;

  saveProfile(profile: Profile): Promise<void>;

  upsertSubject(subject: Subject): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  upsertDocument(doc: StudyDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  upsertConcepts(concepts: Concept[]): Promise<void>;
  deleteConcepts(ids: string[]): Promise<void>;

  addAttempt(attempt: Attempt): Promise<void>;
  upsertQuestions(questions: Question[]): Promise<void>;
  upsertFlashcards(cards: Flashcard[]): Promise<void>;
  upsertSchedule(schedule: CardSchedule): Promise<void>;
  addSession(session: StudySession): Promise<void>;
  upsertExamInsight(insight: ExamInsight): Promise<void>;
  upsertConversation(conversation: Conversation): Promise<void>;

  clearAll(): Promise<void>;
}
