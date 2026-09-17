import type { Metadata } from "next";
import { LearnView } from "@/components/learn/LearnView";

export const metadata: Metadata = { title: "Learn" };

export default function Page() {
  return <LearnView />;
}
