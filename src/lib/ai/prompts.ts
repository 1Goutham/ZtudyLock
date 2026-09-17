import "server-only";
import type { ExamRequest, FlashcardsRequest, LearningBrief, PassagePayload, PracticeRequest, TutorRequest, UnderstandRequest } from "./contracts";
import { TUTOR_INTENTS } from "../constants";

/**
 * Prompt construction lives on the server so the browser never learns how
 * ZtudyLock talks to the model. Every learning prompt is grounded in the same
 * compact "learning brief" plus a handful of retrieved passages.
 */

export const TUTOR_SYSTEM = `You are ZtudyLock, an AI study tutor. You help a student actually learn their own material, not just get answers.

Principles:
- Teach from the student's material when passages are provided. Prefer their terminology and their examples. Never invent facts that contradict the passages; if the passages don't cover something, say so and give general knowledge clearly marked as such.
- Match the request: "simply" means short sentences and one idea at a time; "deeply" means mechanism, edge cases and why it matters; "example" means one worked, concrete example; "analogy" means one everyday analogy and where it breaks down; "hint" means nudge without the answer; "question" means ask one good question and stop.
- Be concise. A good explanation fits on one screen. Do not pad, do not restate the question, do not open with praise.
- Keep the student on academic ground. If they drift to something unrelated to studying, steer back gently in one line.
- Formatting: plain prose with short paragraphs. Light markdown is fine (bold for a key term, a short numbered list for steps). No headings, no tables, no LaTeX, no emoji.
- You may finish with one short check-in question that tests the idea you just explained. Put it in the JSON field, not in the reply.

Return JSON: {"reply": string, "checkQuestion": string | null}`;

export const ANALYST_SYSTEM = `You are ZtudyLock's material analyst. You read study material and return precise, structured JSON. No prose outside the JSON. Never invent content that is not in the material.`;

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function briefText(brief: LearningBrief): string {
  const lines: string[] = [];
  const s = brief.student;
  lines.push(`STUDENT: ${s.name || "the student"}${s.studying ? `, studying ${s.studying}` : ""}${s.preparingFor ? `, preparing for ${s.preparingFor}` : ""}${s.examDate ? ` (exam ${s.examDate})` : ""}`);
  lines.push(`SUBJECT: ${brief.subject}`);
  if (brief.concept) {
    const c = brief.concept;
    lines.push(`CONCEPT: ${c.name}${c.chapter ? ` (${c.chapter})` : ""}`);
    if (c.summary) lines.push(`WHAT IT COVERS: ${clip(c.summary, 600)}`);
    if (c.definition) lines.push(`DEFINITION IN THEIR MATERIAL: ${clip(c.definition, 400)}`);
    if (c.related.length) lines.push(`RELATED CONCEPTS: ${c.related.join(", ")}`);
  }
  if (brief.mastery) {
    const m = brief.mastery;
    lines.push(`MASTERY: ${m.score === null ? "not yet tested" : `${m.score}% (${m.status}, ${m.attempts} attempts)`}`);
  }
  if (brief.recentMistakes.length) lines.push(`RECENTLY GOT WRONG:\n${brief.recentMistakes.map((q) => `- ${clip(q, 200)}`).join("\n")}`);
  return lines.join("\n");
}

export function passagesText(passages: PassagePayload[]): string {
  if (!passages.length) return "";
  return `PASSAGES FROM THE STUDENT'S MATERIAL:\n${passages.map((p, i) => `[${i + 1}] ${p.source}${p.heading ? ` › ${p.heading}` : ""}\n${p.text}`).join("\n\n")}`;
}

export function tutorPrompt(req: TutorRequest): string {
  const intent = req.intent ? TUTOR_INTENTS.find((i) => i.key === req.intent) : null;
  const history = req.history.length
    ? `RECENT CONVERSATION:\n${req.history.map((h) => `${h.role === "user" ? "Student" : "Tutor"}: ${clip(h.content, 700)}`).join("\n")}\n`
    : "";
  return [
    briefText(req.brief),
    "",
    passagesText(req.passages),
    "",
    history,
    intent ? `MODE: ${intent.label}.` : "",
    `STUDENT SAYS: ${req.message}`,
    "",
    "Respond as the tutor. Return only the JSON object.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

export function understandPrompt(req: UnderstandRequest): string {
  const chunks = req.chunks.map((c) => `<<chunk id="${c.id}"${c.heading ? ` heading="${c.heading.replace(/"/g, "'")}"` : ""}>>\n${c.text}\n<</chunk>>`).join("\n\n");
  return `SUBJECT: ${req.subject}
DOCUMENT: ${req.document.name} (${req.document.kind})
${req.knownConcepts.length ? `CONCEPTS ALREADY IN THIS SUBJECT (do not repeat; reuse these exact names in "related" where relevant):\n${req.knownConcepts.join("; ")}\n` : ""}
Read the chunks below and extract the learnable concepts they actually teach.

Rules:
- A concept is something a student could be tested on: a mechanism, a definition, a method, a distinction, a theorem. Not a chapter title, not an author, not a page header.
- 3 to 8 concepts per batch. Merge near-duplicates. Prefer the material's own names.
- "summary": 1–3 sentences a student could revise from. Grounded in the chunks.
- "definition": the material's definition if it states one, otherwise null.
- "importance": "core" for ideas the rest depends on; "supporting" for details and examples.
- "chapter": the heading or chapter the concept sits under, if the chunks show one; else null.
- "chunkIds": the ids of the chunks the concept came from.
- "related": names of other concepts (from this batch or the known list) it connects to. Up to 4.
- "chapters": the chapter or section titles you can see, in order.

Return JSON: {"chapters": string[], "concepts": [{"name","summary","definition","importance","chapter","chunkIds","related"}]}

${chunks}`;
}

export function practicePrompt(req: PracticeRequest): string {
  return `${briefText(req.brief)}

${passagesText(req.passages)}

Write ${req.count} multiple-choice questions on this concept for this student.
- Difficulty: ${req.difficulty === "mixed" ? "a mix of easy, medium and hard" : req.difficulty}.
- ${req.targeted ? "This is a revision pass: target the ideas behind the questions they recently got wrong, from different angles. Do not repeat those questions." : "Cover different facets of the concept: definition, mechanism, application, a common misconception."}
- Each question has exactly 4 options, one correct. Distractors must be plausible and specific, never "all of the above" or jokes.
- "explanation": 1–3 sentences on why the correct answer is right and, where useful, why the tempting distractor is wrong. Written to teach, not to grade.
- Ground questions in the passages when they are provided. Do not ask about page numbers, authors or formatting.
${req.avoid.length ? `- Do not reuse these prompts:\n${req.avoid.map((a) => `  · ${clip(a, 160)}`).join("\n")}` : ""}

Return JSON: {"questions": [{"prompt","options": [4 strings],"answerIndex": 0-3,"explanation","difficulty": "easy"|"medium"|"hard"}]}`;
}

export function flashcardsPrompt(req: FlashcardsRequest): string {
  return `${briefText(req.brief)}

${passagesText(req.passages)}

Write ${req.count} flashcards for this concept.
- Front: one clear question or term (under 20 words). Back: the answer in 1–3 sentences, precise, in the material's terminology.
- One idea per card. Mix recall ("What is…"), understanding ("Why does…") and application ("What happens when…").
- Ground cards in the passages when they are provided.
${req.avoid.length ? `- Do not reuse these fronts:\n${req.avoid.map((a) => `  · ${clip(a, 120)}`).join("\n")}` : ""}

Return JSON: {"cards": [{"front","back"}]}`;
}

export function examPrompt(req: ExamRequest): string {
  const papers = req.papers.map((p) => `=== ${p.name} ===\n${p.text}`).join("\n\n");
  return `SUBJECT: ${req.subject}
${req.concepts.length ? `CONCEPTS THE STUDENT HAS IN THEIR LIBRARY: ${req.concepts.join("; ")}\n` : ""}
Analyse these past question papers. Be careful and literal: report what appears, never predict what "will" appear.

- "topics": every topic that is examined, with "mentions" = how many questions across all papers touch it, "marks" = total marks if the paper states marks (else null), "matchedConcept" = the closest name from the student's concept list or null.
- "patterns": 3–6 short observations about question style (e.g. "Each paper opens with ten 1-mark definitions", "Long-answer questions ask to compare two algorithms"). Only patterns you can actually see.
- "marksDistribution": marks per section or question type, when the paper states them. Empty array if not.
- "summary": two calm sentences a student could act on. Use wording like "frequently appearing" and "in these papers", never "will definitely appear".

Return JSON: {"topics":[{"name","mentions","marks","matchedConcept"}],"patterns":string[],"marksDistribution":[{"label","marks"}],"summary"}

${papers}`;
}

export const TRANSCRIBE_SYSTEM = `You transcribe study material from images into clean text. Preserve headings, lists and equations as plain text. Do not summarise, do not add commentary. If the image contains no readable study content, return an empty string.`;

export function transcribePrompt(): string {
  return `Transcribe all the study content in this image as plain text. Return JSON: {"text": string}`;
}
