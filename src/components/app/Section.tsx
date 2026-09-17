import { cx } from "@/lib/utils";

/** A labelled band of content: small mono label, hairline, then children. */
export function Section({ label, aside, children, className, rule = true }: { label: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string; rule?: boolean }) {
  return (
    <section className={cx(className)}>
      <div className={cx("flex items-baseline justify-between gap-4 pb-3", rule && "border-b border-line")}>
        <p className="label">{label}</p>
        {aside && <div className="mono text-[11px] text-ink-4">{aside}</div>}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}
