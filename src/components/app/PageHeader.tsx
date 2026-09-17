import { cx } from "@/lib/utils";

export function PageHeader({ index, title, description, actions, className, size = "lg" }: { index?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string; size?: "lg" | "md" }) {
  return (
    <div className={cx("mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {index && <p className="label mb-4 animate-rise">{index}</p>}
        <h1 className={cx("display animate-rise text-ink", size === "lg" ? "text-[40px] md:text-[56px]" : "text-[32px] md:text-[40px]")} style={{ "--i": 1 } as React.CSSProperties}>
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-lg animate-rise text-[15px] leading-relaxed text-ink-3" style={{ "--i": 2 } as React.CSSProperties}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3 animate-rise" style={{ "--i": 3 } as React.CSSProperties}>{actions}</div>}
    </div>
  );
}
