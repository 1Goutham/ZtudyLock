import type { Metadata } from "next";
import { Suspense } from "react";
import { SubjectView } from "@/components/library/SubjectView";

export const metadata: Metadata = { title: "Subject" };

export default async function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return (
    <Suspense>
      <SubjectView subjectId={subjectId} />
    </Suspense>
  );
}
