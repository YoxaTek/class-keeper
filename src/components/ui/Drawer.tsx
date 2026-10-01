"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import s from "./Drawer.module.scss";

const ANIMATION_MS = 200; // keep in sync with $duration in Drawer.module.scss

/**
 * A panel over a dimmed backdrop, for focused create/edit forms that don't
 * need a full page. Closes on Escape or a backdrop click.
 *
 * Below the `sm` breakpoint it's a bottom sheet sized to its own content
 * (capped at 85dvh, scrolling internally past that); at `sm` and up it's a
 * full-height panel on the right.
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const tCommon = useTranslations("common");
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

  // Portaled to <body>: rendered inline it sits inside AppShell's scrolling
  // <main>, so wheel scrolling over the backdrop would scroll the page
  // behind it (body's overflow:hidden above doesn't touch that container).
  return createPortal(
    <div
      className={`${s.overlay} ${closing ? s.closing : ""}`}
      onClick={(e) => e.target === e.currentTarget && setClosing(true)}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={s.panel}>
        <div className={s.handle} aria-hidden />
        <div className={s.header}>
          <h2 className={s.title}>{title}</h2>
          <button type="button" onClick={() => setClosing(true)} aria-label={tCommon("close")} className={s.close}>
            <X size={16} />
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
