# ZtudyLock

**An AI study workspace that helps you actually learn.** Upload your material; ZtudyLock understands
it, teaches you from it, tests you, finds what's weak and adapts what you study next.

```
Upload → Understand → Learn → Practise → Test → Identify weakness → Revise → Master
```

A product by [1Goutham](https://1goutham.space). Product and design notes live in
[`docs/PRODUCT.md`](docs/PRODUCT.md).

## What it does

| Area | What happens |
| --- | --- |
| `/` | Editorial landing. |
| `/onboarding` | Four progressive questions: what you study, what for, when, your material. |
| `/home` | Greeting, today's plan (derived from what's weak, due and next), currently learning, needs attention. |
| `/library` | Subjects → documents, extracted concepts grouped by chapter, progress, weak areas. Upload PDFs, text, photographed pages, or paste notes. |
| `/learn` | Concept pages with summary, definition, related concepts, source passages and a tutor grounded in your material. Without a concept: *Ask your material*. |
| `/practice` | Quiz, spaced-repetition flashcards, revision pass for weak concepts, mock tests, exam mode from past papers. |
| `/progress` | Mastery per subject and concept, strengths, what needs a pass, 14-day history, streak. |
| `/settings` | Profile, AI engine status, export / reset. |

### The adaptive core

- **Mastery** is computed from real attempts with recency weighting (`src/lib/learning/mastery.ts`).
- **Weakness detection** flags a concept after low scores or consecutive misses and surfaces it on Home.
- **Revision pass**: simple explanation → worked example → five targeted questions → reassessment.
- **Flashcards** use SM-2 (`Again / Hard / Good / Easy`); Home shows what's due.
- **Today's plan** is built from state (`src/lib/learning/plan.ts`), not a template.

## Getting started

```bash
npm install
cp .env.example .env.local   # add a free GEMINI_API_KEY
npm run dev
```

Without a key the app runs; reading material, the tutor and practice show a clear "not connected" state
with the free signup link (Settings → AI engine).

## Architecture

```
src/
  app/
    api/{understand,tutor,practice,flashcards,exam,transcribe,engine}   server routes
    (workspace)/{home,library,learn,practice,progress,settings}          app pages, shared AppShell
    onboarding/  page.tsx (landing)
  components/   ui/ (Button, Chip, Field, Meter, Sheet, …), app/, home/, library/, learn/, practice/, progress/, settings/
  lib/
    types.ts            domain model (Profile, Subject, StudyDocument, Concept, Attempt, Flashcard, …)
    learning/           chunking, BM25 retrieval, mastery, SM-2 scheduler, daily plan
    documents/          pdf.js + text extraction (browser)
    ai/                 contracts, engine + providers (server), prompts (server), route helpers, client (browser)
    hooks/              useUnderstand (the upload → concepts pipeline), usePractice, useSessionTimer
    storage/            StudyRepository interface + LocalRepository (localStorage)
    store/              WorkspaceProvider: hydrated state + typed actions
```

**Cost awareness.** PDFs are parsed in the browser with pdf.js and chunked. Concept extraction sends
six chunks per request (capped and sampled for very long documents). Tutor, quiz and flashcard
requests carry a compact *learning brief* plus the top passages from a lexical retriever, never whole
documents. Generated questions and cards are cached and reused before the model is asked again.

**AI engine.** Providers are pluggable (Gemini first; Groq / OpenRouter / any OpenAI-compatible
endpoint as fallback). Model IDs are resolved from the API so retired names never break the product.
Per-IP rate limiting, typed `{ ok, data | error }` envelopes, JSON mode with tolerant parsing.

**Persistence.** Everything goes through `StudyRepository`. Today that is browser storage. A Supabase
implementation (auth + tables mirroring `types.ts`) slots in behind the same interface.

## What remains

- Accounts and sync (the repository interface is the seam).
- Photographed notes are transcribed one image at a time via Gemini; large scans are rejected.
- Exam analysis is text-based; scanned papers need transcription first.
- Streaming tutor replies.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the build
npm run lint     # eslint
```
