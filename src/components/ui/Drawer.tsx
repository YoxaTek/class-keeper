"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ANIMATION_MS = 200;

/**
 * A side panel over a dimmed backdrop, for focused create/edit forms (or
 * mobile nav) that don't need a full page. Closes on Escape or a backdrop
 * click. Full-width below the `sm` breakpoint so it reads as a full-screen
 * sheet on phones rather than a narrow strip.
 *
 * `footer` (if given) is pinned below the scrollable body instead of
 * flowing with `children` — a tall form's Save/Cancel bar otherwise scrolls
 * out of view on short mobile viewports.
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
  footer,
  side = "right",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right";
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

  // Tailwind's scanner only picks up complete literal class strings from the
  // source text — it can't resolve `` `[animation:${x}]` `` interpolation,
  // so each side/state combination has to appear here as a full literal.
  const slideInClass =
    side === "left" ? "[animation:drawer-slide-in-left_0.2s_ease-out]" : "[animation:drawer-slide-in_0.2s_ease-out]";
  const slideOutClass =
    side === "left"
      ? "[animation:drawer-slide-out-left_0.2s_ease-in_forwards]"
      : "[animation:drawer-slide-out_0.2s_ease-in_forwards]";

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
        className={`absolute inset-y-0 ${side === "left" ? "left-0 border-r" : "right-0 border-l"} flex w-full flex-col overflow-x-hidden border-zinc-200 bg-white shadow-xl sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900 ${
          closing ? slideOutClass : slideInClass
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">{footer}</div>
        )}
      </div>
    </div>
  );
}
