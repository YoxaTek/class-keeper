import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      locale: string | null;
      onboardingComplete: boolean;
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    locale: string | null;
    onboardingComplete: boolean;
    organizationId: string | null;
    // Credentials-login-only: whether this sign-in should get the long
    // ("remember me") session lifetime or the short default one — read
    // once at sign-in by the jwt() callback, see src/lib/auth.ts.
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    locale: string | null;
    onboardingComplete: boolean;
    organizationId: string | null;
    rememberMe?: boolean;
  }
}
