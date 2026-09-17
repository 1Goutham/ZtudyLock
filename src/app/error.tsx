"use client";

import { Button, LinkButton } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col justify-center px-6 md:px-10">
      <p className="label mb-4">Something went wrong</p>
      <h1 className="display text-[40px] text-ink md:text-[56px]">That didn&apos;t load.</h1>
      <p className="mt-4 max-w-md text-[15px] text-ink-3">Your material and progress are safe in this browser. {error.digest ? `Reference ${error.digest}.` : ""}</p>
      <div className="mt-8 flex items-center gap-4">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <LinkButton href="/home">Go home</LinkButton>
      </div>
    </main>
  );
}
