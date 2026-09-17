import type { Metadata } from "next";
import { Suspense } from "react";
import { FlashcardsRoute } from "@/components/practice/routes";

export const metadata: Metadata = { title: "Flashcards" };

export default function Page() {
  return (
    <Suspense>
      <FlashcardsRoute />
    </Suspense>
  );
}
