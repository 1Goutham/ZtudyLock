import type { DocumentKind, TutorIntent } from "./types";

export const APP_NAME = "ZtudyLock";
export const APP_TAGLINE = "An AI study workspace that helps you actually learn.";

/** Who makes ZtudyLock. Mirrors the portfolio at 1goutham.space. */
export const AUTHOR = {
  name: "Goutham G",
  handle: "1Goutham",
  site: "https://1goutham.space",
  linkedin: "https://www.linkedin.com/in/goutham-g-98a0ba253/",
  github: "https://github.com/1Goutham",
  email: "gouthamgopinath.tsi@gmail.com",
} as const;

export const DOCUMENT_KINDS: { key: DocumentKind; label: string; hint: string }[] = [
  { key: "notes", label: "Notes", hint: "Class notes, handouts, summaries." },
  { key: "textbook", label: "Textbook", hint: "Chapters or excerpts from a book." },
  { key: "slides", label: "Slides", hint: "Lecture decks exported as PDF." },
  { key: "question-paper", label: "Question paper", hint: "Past papers. Used for exam analysis." },
  { key: "syllabus", label: "Syllabus", hint: "What the course expects you to know." },
  { key: "other", label: "Other", hint: "Anything else worth learning from." },
];

export const TUTOR_INTENTS: { key: TutorIntent; label: string; prompt: string }[] = [
  { key: "simple", label: "Explain simply", prompt: "Explain this simply." },
  { key: "deep", label: "Explain deeply", prompt: "Explain this in depth." },
  { key: "example", label: "Give an example", prompt: "Give me a concrete example." },
  { key: "analogy", label: "Use an analogy", prompt: "Explain it with an analogy." },
  { key: "question", label: "Ask me a question", prompt: "Ask me a question to check I understand." },
  { key: "hint", label: "Give me a hint", prompt: "Give me a hint, not the answer." },
];

export const DEFAULT_DAILY_MINUTES = 45;
export const DAILY_MINUTE_OPTIONS = [20, 30, 45, 60, 90];

/** Files we can read in the browser. PDFs are parsed with pdf.js; images are transcribed server-side. */
export const ACCEPTED_FILES = ".pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/markdown,image/png,image/jpeg,image/webp";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Characters kept per document; enough for a long chapter, small enough for browser storage. */
export const MAX_DOCUMENT_CHARS = 240_000;

/** Chunking targets, in characters. */
export const CHUNK_TARGET = 1_400;
export const CHUNK_MAX = 2_000;
/** Chunks per concept-extraction request. Keeps each call compact and cheap. */
export const UNDERSTAND_BATCH = 6;

export const QUIZ_LENGTH = 5;
export const MOCK_LENGTH = 10;
export const FLASHCARD_BATCH = 8;
export const MAX_SESSIONS = 2_000;
export const MAX_ATTEMPTS = 5_000;
