import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col justify-center px-6 md:px-10">
      <p className="label mb-4">404</p>
      <h1 className="display text-[40px] text-ink md:text-[64px]">Nothing to learn here.</h1>
      <p className="mt-4 max-w-md text-[15px] text-ink-3">The page you were looking for doesn&apos;t exist, or it moved.</p>
      <div className="mt-8">
        <LinkButton href="/home" variant="primary">Back to ZtudyLock</LinkButton>
      </div>
    </main>
  );
}
