"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to close and
 * inert background come from the browser.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      className={cx(
        "m-auto max-h-[90vh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border border-sand-300 bg-paper p-0 text-ink shadow-card open:flex",
        size === "lg" ? "max-w-3xl" : "max-w-lg",
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-sand-200 bg-sand-150 px-5 py-4">
        <div>
          <h2 id="dialog-title" className="text-base font-medium">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-ink-subtle hover:bg-sand-200 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-sand-200 bg-sand-150 px-5 py-3">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
