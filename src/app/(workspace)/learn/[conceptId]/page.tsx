import type { Metadata } from "next";
import { ConceptView } from "@/components/learn/ConceptView";

export const metadata: Metadata = { title: "Learn" };

export default async function Page({ params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  return <ConceptView conceptId={conceptId} />;
}
