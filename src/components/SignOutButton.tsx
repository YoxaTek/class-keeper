"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import s from "./SignOutButton.module.scss";

export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={s.button}
    >
      <LogOut aria-hidden />
      {label}
    </button>
  );
}
