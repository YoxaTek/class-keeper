"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { QrCode, ImageUp, ArrowLeft, CircleCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { inputClass, labelClass } from "@/components/ui/styles";
import { parseInviteLink, buildInvitesLoginRedirect } from "@/lib/parseInviteLink";

// jsQR is only needed once a scan actually starts — keep it out of the
// initial bundle of every page that merely renders the scan button (login).
const loadJsQR = () => import("jsqr").then((m) => m.default);

interface InviteContext {
  role: Role;
  invitedByName: string;
  context: string;
}
interface CourseInfo {
  id: string;
  name: string;
  institute: string | null;
  subject: { name: string };
}

type View =
  | { kind: "scan" }
  | { kind: "loading" }
  | { kind: "redirecting" }
  | { kind: "invite"; token: string; invite: InviteContext }
  | { kind: "join"; course: CourseInfo; initialName: string }
  | { kind: "error"; message: string };

/**
 * A button that opens a live camera view and decodes a QR code from it —
 * the scan-side counterpart to the join/invite QR code a teacher shows
 * (see JoinLinkCard/InviteLinkBox). A decoded ClassKeeper invite/join link
 * is resolved and accepted right here, as further steps of the same
 * drawer — no page navigation in between — instead of just handing the
 * browser a URL to load.
 *
 * The trigger label/drawer title/help text are caller-supplied since this
 * gets used from more than one context (login's "join a course" QR vs. the
 * dashboard's "accept an invite" QR) — everything else (camera/upload
 * errors, the unrecognized-code message) is generic enough to live here.
 */
export function QrScannerButton({
  triggerLabel,
  title,
  helpText,
  variant = "secondary",
  className = "w-full text-base font-bold",
}: {
  triggerLabel: string;
  title: string;
  helpText: string;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  className?: string;
}) {
  const t = useTranslations("qrScanner");
  const tInvites = useTranslations("invites");
  const tJoin = useTranslations("join");
  const tCommon = useTranslations("common");
  const tRole = useTranslations("common.role");
  const { update } = useSession();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "scan" });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState(false);

  const [joinName, setJoinName] = useState("");
  const [joinChineseName, setJoinChineseName] = useState("");
  const [joinStudentId, setJoinStudentId] = useState("");

  function reset() {
    setView({ kind: "scan" });
    setActionError(null);
    setSubmitting(false);
  }

  // A beat of visible "yes, that scan worked" confirmation before the hard
  // navigation actually fires — without it, a redirect straight to another
  // page (e.g. back to /login, unauthenticated) happens so fast it reads
  // as if the scan did nothing at all.
  function redirectAfterConfirm(url: string) {
    setView({ kind: "redirecting" });
    setTimeout(() => {
      window.location.href = url;
    }, 600);
  }

  // Shared by both the live camera loop and an uploaded image — resolves a
  // decoded QR payload to whichever next step it describes, all within
  // this same drawer.
  const onDecoded = useCallback(
    async (data: string) => {
      if (!/^https?:\/\//i.test(data)) {
        setView({ kind: "error", message: t("qrUnrecognized") });
        return;
      }

      const parsed = parseInviteLink(data, window.location.origin);
      if (!parsed) {
        // Not one of our known link shapes — fall back to a real
        // navigation rather than assume it's unrecognized.
        redirectAfterConfirm(data);
        return;
      }

      setView({ kind: "loading" });
      try {
        if (parsed.param === "token") {
          const res = await fetch(`/api/invites/${encodeURIComponent(parsed.value)}`);
          if (res.status === 401) {
            // Not signed in (this button also lives on the logged-out
            // login page) — go straight to /login with a callback back to
            // this same invite, rather than the /invite/<token> landing
            // page's own sign-in-or-sign-up chooser: we're already on (or
            // one tap from) the login page, which already links to signup.
            redirectAfterConfirm(buildInvitesLoginRedirect("token", parsed.value));
            return;
          }
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            const reason = body?.error;
            const known = ["not_found", "expired", "already_accepted", "email_mismatch", "already_onboarded"];
            setView({ kind: "error", message: known.includes(reason) ? tInvites(`error.${reason}`) : tInvites("genericError") });
            return;
          }
          setView({ kind: "invite", token: parsed.value, invite: body.invite });
        } else {
          const res = await fetch(`/api/courses/${encodeURIComponent(parsed.value)}/join`);
          if (res.status === 401) {
            redirectAfterConfirm(buildInvitesLoginRedirect("course", parsed.value));
            return;
          }
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            setView({ kind: "error", message: tJoin("error") });
            return;
          }
          if (body.alreadyTeaches) {
            setView({ kind: "error", message: tJoin("alreadyTeaching") });
            return;
          }
          setJoinName(body.initialName ?? "");
          setJoinChineseName("");
          setJoinStudentId("");
          setView({ kind: "join", course: body.course, initialName: body.initialName ?? "" });
        }
      } catch {
        setView({ kind: "error", message: tInvites("genericError") });
      }
    },
    [t, tInvites, tJoin]
  );

  useEffect(() => {
    if (!open || view.kind !== "scan") return;

    let cancelled = false;
    let jsQR: Awaited<ReturnType<typeof loadJsQR>>;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            onDecoded(code.data);
            return; // Stop the loop — a decode ends the scan either way.
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setView({ kind: "error", message: t("cameraUnsupported") });
        return;
      }
      try {
        jsQR = await loadJsQR();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setView({ kind: "error", message: t("cameraError") });
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, view.kind, t, onDecoded]);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again if it fails
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("image failed to load"));
        image.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = (await loadJsQR())(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        await onDecoded(code.data);
      } else {
        setView({ kind: "error", message: t("qrImageNotFound") });
      }
    } catch {
      setView({ kind: "error", message: t("qrImageError") });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  // Typed/pasted link instead of a scan — same resolution path as a decoded QR.
  function onPasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInviteLink(pasted, window.location.origin);
    if (!parsed) {
      setPasteError(true);
      return;
    }
    const path = parsed.param === "token" ? "invite" : "join";
    onDecoded(new URL(`/${path}/${encodeURIComponent(parsed.value)}`, window.location.origin).href);
  }

  async function onAcceptInvite(token: string) {
    setSubmitting(true);
    setActionError(null);

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      // Keeps role/onboardingComplete fresh in the session cookie for the
      // rest of the app — see OnboardingForm for the full reasoning behind
      // the hard navigation that follows instead of router.push()+refresh().
      await update().catch(() => {});
      window.location.href = "/";
      return;
    }

    setSubmitting(false);
    const body = await res.json().catch(() => null);
    setActionError(typeof body?.error === "string" ? body.error : tInvites("genericError"));
  }

  async function onSubmitJoin(e: React.FormEvent, courseId: string) {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    const res = await fetch(`/api/courses/${courseId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, chineseName: joinChineseName || undefined, studentId: joinStudentId }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => null);
      setActionError(typeof body?.error === "string" ? body.error : tJoin("error"));
      return;
    }
    // Hard navigation so the freshly updated role/onboarding state (set
    // server-side by the join) is reflected immediately.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/me";
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant={variant}
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={className}
      >
        <QrCode className="h-5 w-5" aria-hidden />
        {triggerLabel}
      </Button>
    );
  }

  return (
    <Drawer
      title={title}
      onClose={() => {
        setOpen(false);
        reset();
      }}
    >
      <div className="space-y-3">
        {view.kind === "scan" && (
          <>
            <div className="aspect-square overflow-hidden rounded-md border border-zinc-200 bg-black dark:border-zinc-800">
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
              <ImageUp className="h-3.5 w-3.5" aria-hidden />
              {t("uploadQrImage")}
            </Button>

            <form onSubmit={onPasteSubmit} className="space-y-2">
              <input
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  setPasteError(false);
                }}
                placeholder={tInvites("entryPlaceholder")}
                className={inputClass}
              />
              {pasteError && <p className="text-sm text-red-600 dark:text-red-400">{tInvites("entryError")}</p>}
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                {tInvites("entrySubmit")}
              </Button>
            </form>

            <p className="text-xs text-zinc-500 dark:text-zinc-500">{helpText}</p>
          </>
        )}

        {view.kind === "loading" && (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-500">{tCommon("loading")}</p>
        )}

        {view.kind === "redirecting" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CircleCheck className="h-8 w-8 text-[#0f6e56] dark:text-teal-400" aria-hidden />
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{t("recognized")}</p>
          </div>
        )}

        {view.kind === "invite" && (
          <>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {tInvites("inviteBanner", { name: view.invite.invitedByName, role: tRole(view.invite.role) })}
              {view.invite.context && (
                <div className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{view.invite.context}</div>
              )}
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <Button
              type="button"
              variant="primary"
              onClick={() => onAcceptInvite(view.token)}
              disabled={submitting}
              className="w-full"
            >
              {tInvites("accept")}
            </Button>
          </>
        )}

        {view.kind === "join" && (
          <form onSubmit={(e) => onSubmitJoin(e, view.course.id)} className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {view.course.subject.name} · {view.course.name}
              {view.course.institute && ` · ${view.course.institute}`}
            </p>
            <div className="space-y-1">
              <label htmlFor="qr-join-name" className={labelClass}>
                {tJoin("name")}
              </label>
              <input
                id="qr-join-name"
                required
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="qr-join-chinese-name" className={labelClass}>
                {tJoin("chineseName")}
              </label>
              <input
                id="qr-join-chinese-name"
                value={joinChineseName}
                onChange={(e) => setJoinChineseName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="qr-join-student-id" className={labelClass}>
                {tJoin("studentId")}
              </label>
              <input
                id="qr-join-student-id"
                required
                value={joinStudentId}
                onChange={(e) => setJoinStudentId(e.target.value)}
                className={inputClass}
              />
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? tJoin("submitting") : tJoin("submit")}
            </Button>
          </form>
        )}

        {view.kind === "error" && (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">{view.message}</p>
            <Button type="button" variant="secondary" onClick={reset} className="w-full">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {t("scanAgain")}
            </Button>
          </>
        )}
      </div>
    </Drawer>
  );
}
