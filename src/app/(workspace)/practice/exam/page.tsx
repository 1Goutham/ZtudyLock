import type { Metadata } from "next";
import { Suspense } from "react";
import { ExamRoute } from "@/components/practice/routes";

export const metadata: Metadata = { title: "Exam mode" };

export default function Page() {
  return (
    <Suspense>
      <ExamRoute />
    </Suspense>
  );
}
