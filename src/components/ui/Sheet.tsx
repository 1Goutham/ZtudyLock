"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { cx } from "@/lib/utils";
import { IconX } from "./Icons";

/**
 * A floating panel: a centred dialog on desktop, a bottom sheet on mobile.
 * Glass, spring-in, escape to close, scroll locked underneath.
 */
export function Sheet({ open, onClose, title, description, children, className, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
            className={cx("float relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]", wide ? "sm:max-w-3xl" : "sm:max-w-xl", className)}
          >
            <div className="flex items-start justify-between gap-6 px-6 pt-6 sm:px-8 sm:pt-8">
              <div>
                {title && <h2 className="display text-[24px] text-ink sm:text-[28px]">{title}</h2>}
                {description && <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-3">{description}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="press -mr-2 -mt-1 flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-white/8 hover:text-ink">
                <IconX size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-8 pt-6 sm:px-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
