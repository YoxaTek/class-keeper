"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";

/**
 * A button that opens a live camera view and decodes a QR code from it —
 * the scan-side counterpart to the join QR code a teacher shows students
 * (see JoinLinkCard). A decoded ClassKeeper link navigates the browser
 * there directly; anything else is reported as unrecognized.
 */
export function QrScannerButton() {
  const t = useTranslations("login");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    function onDecoded(data: string) {
      // The QR codes this app generates always encode an absolute
      // http(s) link (see JoinLinkCard) — anything else isn't ours.
      if (/^https?:\/\//i.test(data)) {
        window.location.href = data;
      } else {
        setError(t("qrUnrecognized"));
      }
    }

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
        setError(t("cameraUnsupported"));
        return;
      }
      try {
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
        setError(t("cameraError"));
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, t]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="w-full text-base font-bold"
      >
        <QrCode className="h-5 w-5" aria-hidden />
        {t("scanQr")}
      </Button>
    );
  }

  return (
    <Drawer title={t("scanQrTitle")} onClose={() => setOpen(false)}>
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-md border border-zinc-200 bg-black dark:border-zinc-800">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">{t("scanQrHelp")}</p>
        )}
      </div>
    </Drawer>
  );
}
