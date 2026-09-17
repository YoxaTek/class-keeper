"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ANIMATION_MS = 200;

/**
 * A right-side panel over a dimmed backdrop, for focused create/edit forms
 * that don't need a full page. Closes on Escape or a backdrop click.
 *
 * The parent controls mounting (open && <Drawer/>), which would normally
 * unmount this instantly on close with no time for an exit animation to
 * play. So closing here is two-phase: a click/Escape starts the "closing"
 * exit animation immediately, and only calls the parent's onClose once
 * that animation has actually finished.
 */
export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setClosing(true);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/40 ${
          closing
            ? "[animation:drawer-backdrop-out_0.2s_ease-in_forwards]"
            : "[animation:drawer-backdrop-in_0.2s_ease-out]"
        }`}
        onClick={() => setClosing(true)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 ${
          closing
            ? "[animation:drawer-slide-out_0.2s_ease-in_forwards]"
            : "[animation:drawer-slide-in_0.2s_ease-out]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={() => setClosing(true)}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
