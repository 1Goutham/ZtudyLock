import ReactMarkdown from "react-markdown";
import { cx } from "@/lib/utils";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx("prose-tutor", className)}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
