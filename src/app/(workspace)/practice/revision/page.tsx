import type { Metadata } from "next";
import { Suspense } from "react";
import { RevisionRoute } from "@/components/practice/routes";

export const metadata: Metadata = { title: "Revision pass" };

export default function Page() {
  return (
    <Suspense>
      <RevisionRoute />
    </Suspense>
  );
}
