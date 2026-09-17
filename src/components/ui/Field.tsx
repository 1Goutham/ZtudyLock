"use client";

import { forwardRef, useEffect, useId, useRef } from "react";
import { cx } from "@/lib/utils";

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  optional?: boolean;
  error?: string;
  className?: string;
  children: (id: string) => React.ReactNode;
  aside?: React.ReactNode;
}

export function Field({ label, hint, optional, error, className, children, aside }: FieldProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      {(label || aside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[14px] text-ink">
              {label}
              {optional && <span className="label ml-2 normal-case tracking-normal">optional</span>}
            </label>
          )}
          {aside && <span className="mono text-[11.5px] text-ink-4">{aside}</span>}
        </div>
      )}
      {children(id)}
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : hint ? <p className="text-[12.5px] leading-relaxed text-ink-3">{hint}</p> : null}
    </div>
  );
}

/** Underline-only input. */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx("field-line w-full text-[17px] text-ink placeholder:text-ink-4", className)} {...rest} />;
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autosize?: boolean;
  minRows?: number;
  bare?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, autosize, minRows = 3, bare, value, onChange, ...rest }, ref) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !autosize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autosize]);
  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      rows={minRows}
      value={value}
      onChange={onChange}
      className={cx(
        "w-full resize-none bg-transparent text-ink placeholder:text-ink-4 focus:outline-none",
        !bare && "rounded-md border border-line-2 px-4 py-3 text-[15px] leading-relaxed transition-colors hover:border-ink-3 focus:border-ink",
        className,
      )}
      {...rest}
    />
  );
});
