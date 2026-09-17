import type { Metadata } from "next";
import { Suspense } from "react";
import { MockRoute } from "@/components/practice/routes";

export const metadata: Metadata = { title: "Mock test" };

export default function Page() {
  return (
    <Suspense>
      <MockRoute />
    </Suspense>
  );
}
