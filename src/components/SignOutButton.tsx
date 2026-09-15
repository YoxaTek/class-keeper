"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ label }: { label: string }) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className="underline">
      {label}
    </button>
  );
}
