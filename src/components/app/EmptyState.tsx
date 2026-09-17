import { cx } from "@/lib/utils";

export function EmptyState({ title, description, action, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("border-y border-line py-16 md:py-20 animate-fade", className)}>
      <p className="display text-[28px] text-ink md:text-[36px]">{title}</p>
      {description && <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-3">{description}</p>}
      {action && <div className="mt-8 flex flex-wrap items-center gap-4">{action}</div>}
    </div>
  );
}
