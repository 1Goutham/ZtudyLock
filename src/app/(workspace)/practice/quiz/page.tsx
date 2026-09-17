import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizRoute } from "@/components/practice/routes";

export const metadata: Metadata = { title: "Quiz" };

export default function Page() {
  return (
    <Suspense>
      <QuizRoute />
    </Suspense>
  );
}
