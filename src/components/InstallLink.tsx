"use client";

import { useInstall } from "@/components/InstallProvider";

/** A text button that starts the install flow — see InstallProvider. */
export function InstallLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const { install } = useInstall();
  return (
    <button type="button" onClick={install} className={className}>
      {children}
    </button>
  );
}
