"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MOCK_LENGTH, QUIZ_LENGTH } from "@/lib/constants";
import { conceptMastery } from "@/lib/learning/mastery";
import { useWorkspace } from "@/lib/store";
import { LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/app/EmptyState";
import { ExamMode } from "./ExamMode";
import { Flashcards } from "./Flashcards";
import { Quiz } from "./Quiz";
import { RevisionPass } from "./RevisionPass";

/** Thin client wrappers that read search params and pick data for each mode. */

function Missing({ what }: { what: string }) {
  return <EmptyState title={`${what} not found.`} description="Pick something to practise from the hub." action={<LinkButton href="/practice" variant="primary">Back to Practice</LinkButton>} />;
}

export function QuizRoute() {
  const params = useSearchParams();
  const { concepts } = useWorkspace();
  const concept = concepts.find((c) => c.id === params.get("concept")) ?? null;
  if (!concept) return <Missing what="Concept" />;
  return <Quiz key={concept.id} concepts={[concept]} mode="quiz" count={QUIZ_LENGTH} exitHref={`/learn/${concept.id}`} />;
}

export function FlashcardsRoute() {
  const params = useSearchParams();
  const { concepts } = useWorkspace();
  const id = params.get("concept");
  const concept = id ? concepts.find((c) => c.id === id) ?? null : null;
  if (id && !concept) return <Missing what="Concept" />;
  return <Flashcards key={id ?? "due"} concept={concept} dueOnly={params.get("due") === "1"} />;
}

export function RevisionRoute() {
  const params = useSearchParams();
  const { concepts } = useWorkspace();
  const concept = concepts.find((c) => c.id === params.get("concept")) ?? null;
  if (!concept) return <Missing what="Concept" />;
  return <RevisionPass key={concept.id} concept={concept} />;
}

export function MockRoute() {
  const params = useSearchParams();
  const { subjects, concepts, attempts, examInsights } = useWorkspace();
  const subjectId = params.get("subject");
  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const fromExam = params.get("exam") === "1";

  const picked = useMemo(() => {
    if (!subject) return [];
    const own = concepts.filter((c) => c.subjectId === subject.id);
    const insight = fromExam ? examInsights.find((e) => e.subjectId === subject.id) : null;
    const weight = (id: string) => {
      const m = conceptMastery(id, attempts);
      let w = m.status === "weak" ? 3 : m.status === "untested" ? 2 : m.status === "developing" ? 1.5 : 1;
      const topic = insight?.topics.find((t) => t.conceptId === id);
      if (topic) w += Math.min(3, topic.mentions);
      return w;
    };
    return [...own].sort((a, b) => weight(b.id) - weight(a.id)).slice(0, 5);
  }, [subject, concepts, attempts, examInsights, fromExam]);

  if (!subject || !picked.length) return <Missing what="Subject" />;
  return <Quiz key={subject.id} concepts={picked} mode="mock" count={MOCK_LENGTH} title={`Mock test · ${subject.name}`} exitHref={fromExam ? `/practice/exam?subject=${subject.id}` : "/practice"} />;
}

export function ExamRoute() {
  const params = useSearchParams();
  return <ExamMode initialSubjectId={params.get("subject")} />;
}
