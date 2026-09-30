"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const ANIMATION_MS = 200;

/**
 * A panel over a dimmed backdrop, for focused create/edit forms that don't
 * need a full page. Closes on Escape or a backdrop click.
 *
 * Below the `sm` breakpoint it's a bottom sheet sized to its own content
 * (capped at 85dvh, scrolling internally past that) instead of a full-height
 * drawer — a short form no longer leaves a wall of empty space below it. At
 * `sm` and up it's the original full-height side panel from `side`.
 *
 * `footer` (if given) is pinned below the scrollable body instead of
 * flowing with `children` — a tall form's Save/Cancel bar otherwise scrolls
 * out of view.
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
  // so each side/closing combination appears here as a full literal: the
  // base (mobile, bottom sheet) animation together with its sm: (desktop,
  // side panel) override.
  const animationClass =
    side === "left"
      ? closing
        ? "[animation:drawer-sheet-out_0.2s_ease-in_forwards] sm:[animation:drawer-slide-out-left_0.2s_ease-in_forwards]"
        : "[animation:drawer-sheet-in_0.2s_ease-out] sm:[animation:drawer-slide-in-left_0.2s_ease-out]"
      : closing
        ? "[animation:drawer-sheet-out_0.2s_ease-in_forwards] sm:[animation:drawer-slide-out_0.2s_ease-in_forwards]"
        : "[animation:drawer-sheet-in_0.2s_ease-out] sm:[animation:drawer-slide-in_0.2s_ease-out]";
  // Same reasoning — the desktop side (left vs right) has to be a complete
  // literal per branch, not built from a template-interpolated prefix.
  const desktopSideClass = side === "left" ? "sm:left-0 sm:border-r" : "sm:right-0 sm:border-l";

  // Portaled to <body>: rendered inline it sits inside AppShell's scrolling
  // <main>, so wheel/touch scrolling over the backdrop scrolls the page
  // behind it (body's overflow:hidden above doesn't touch that container).
  return createPortal(
    <div className="fixed inset-x-0 top-0 z-50 h-dvh">
      <div
        className={`absolute inset-0 touch-none bg-black/40 ${
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
        className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-zinc-200 bg-white shadow-xl sm:inset-x-auto sm:inset-y-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-t-0 dark:border-zinc-800 dark:bg-zinc-900 ${desktopSideClass} ${animationClass}`}
      >
        <div className="flex justify-center pb-1 pt-2 sm:hidden" aria-hidden>
          <div className="h-1 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
