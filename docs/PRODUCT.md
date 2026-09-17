# ZtudyLock — product & design plan

## 1. Audit of the previous version

**What existed** (6 files, ~400 lines): a single chat page (`src/app/pages/index.tsx`) talking to
`/api/gemini`, which proxied the raw Gemini `generateContent` call with a hard-coded, since-retired
`gemini-2.0-flash` model. The system prompt lived in the browser. Visuals: a photographic background,
white/50% borders, radial "glass" gradients, a peach accent, Poppins/Segoe UI. No persistence, no
routes beyond `/`, no state beyond the message list, no error states beyond toasts.

**What was worth keeping:** the study-only guard-rail in the system prompt, `sonner` for toasts,
`react-markdown` for answers, the Next.js 15 + Tailwind 4 + TypeScript stack, and the product name.

**What was not:** the chatbot framing, the client-side prompt, the retired model, the image assets.

## 2. Product concept

> ZtudyLock doesn't just answer your questions. It helps you actually learn.

An AI study workspace built around one loop:

```
Upload → Understand → Learn → Practise → Test → Identify weakness → Revise → Master
```

Every AI feature has to answer "does this help the student learn?". Features that only sound like
AI (auto-summaries of everything, chat for the sake of chat) are out.

### The adaptive core

Mastery is computed per concept from real attempts (quiz, flashcards, mock tests, revision
reassessments) with recency weighting (`lib/learning/mastery.ts`). Weakness detection flags a concept
when mastery is low after enough attempts, or after consecutive misses. A flagged concept gets a
**revision pass**: simple explanation → worked example → five targeted questions → reassessment.
Flashcards use SM-2 scheduling (`Again / Hard / Good / Easy`). Today's plan on Home is derived from
this state (what's due, what's weak, what's next), not from a template.

## 3. Information architecture

| Route | Purpose |
| --- | --- |
| `/` | Editorial landing. "A product by 1Goutham" → 1goutham.space |
| `/onboarding` | Four progressive questions: studying → preparing for → exam date → material |
| `/home` | Greeting, today's plan, currently learning, needs attention |
| `/library` `/library/[subject]` | Subjects → documents, concepts, progress, activity, weak areas |
| `/learn` `/learn/[concept]` | Concept page + tutor. Without a concept: "Ask your material" |
| `/practice` | Quiz, flashcards, revision pass, mock test / exam mode |
| `/progress` | Mastery per subject and concept, strengths, what needs a pass, streak |
| `/settings` | Profile, AI engine status, export / reset |

Mobile: glass bottom navigation, full-screen learning modes, swipeable flashcards.

## 4. Visual system

Dark, cinematic, calm. Apple product page × visionOS material × Ideako's editorial restraint.

- **Base:** `#050505` under an ambient layer the glass can refract: two soft white lights and two
  muted blooms (a cool slate, a warm sand) far too desaturated to read as colour, plus a whisper of grain.
- **Material stack:** background → ambient → floating glass navigation (a pill that blurs whatever
  scrolls under it) → glass panels (translucent, 36px blur, 190% saturation, specular top light, lit
  top edge, soft drop shadow) → interactive glass (chips, secondary buttons, quiz options) → floating
  glass (composer, sheets, the mobile navigation) → the flashcard, the thickest glass in the system.
  Glass is a material, not decoration: most of the page is still typography and hairlines on the
  bare background, and panels are used where content needs to be held.
- **Type:** Apple system stack first (`-apple-system`, SF Pro), Inter as the fallback; Anonymous Pro
  for small uppercase metadata labels (carried from Ideako). Large display headlines with tight
  tracking; quiet secondary text in grey.
- **Colour:** whites and greys for text. One accent, Goutham's lime `#9DFF50`, used only for the
  active state, progress fills and tiny status marks.
- **Motion:** ease-out-expo rises with a blur settle, spring on tactile elements (flashcards,
  buttons), opacity fades between states, no parallax, no constant movement, reduced-motion respected.

## 5. Technical direction

- **Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4. Three new
  dependencies, each earning its place: `motion` (springs, shared layout), `pdfjs-dist` (client-side
  PDF text extraction so PDFs never leave the browser whole), `server-only`.
- **AI engine (`lib/ai`):** ported from Ideako. Pluggable providers (Gemini first, any
  OpenAI-compatible endpoint as fallback), model resolution from the API so retired model IDs never
  break the product, per-IP rate limiting, typed `{ ok, data | error }` envelopes, JSON mode with
  tolerant parsing. Keys never reach the browser.
- **Cost awareness:** documents are chunked in the browser; concept extraction sends one compact
  batch of chunks at a time and asks for structured JSON. Tutor, quiz and flashcard requests carry a
  *learning brief* (subject, concept, mastery, recent mistakes) plus only the top-scoring chunks from
  a lexical retriever (`lib/learning/retrieval.ts`), never whole documents. Generated questions and
  cards are cached per concept and reused before the model is asked again.
- **Persistence:** everything goes through `StudyRepository`. Today `LocalRepository` (localStorage).
  Swap in a Supabase implementation in `lib/storage/index.ts` without touching the UI.
- **Free to run:** Gemini free tier + optional Groq free tier, Vercel hobby, browser storage.

## 6. What remains (honest list)

- Accounts and sync: `StudyRepository` is the seam; needs Supabase auth + tables.
- Images of handwritten notes: `/api/transcribe` accepts one image at a time via Gemini; OCR quality
  varies and large scans are rejected to keep it free.
- Exam-paper analysis is text-based; scanned papers need transcription first.
- Streaming tutor replies (Gemini supports it; the route returns whole messages for simplicity).
