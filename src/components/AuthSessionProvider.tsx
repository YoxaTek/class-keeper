"use client";

import { SessionProvider } from "next-auth/react";

// Mounted once at the root so its initial session fetch has finished long
// before any page needs useSession().update() — a provider scoped locally
// to just one form starts loading from scratch, and calling update() while
// it's still loading silently no-ops (see next-auth's react.js), which is
// what caused onboarding completion to appear to hang.
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
