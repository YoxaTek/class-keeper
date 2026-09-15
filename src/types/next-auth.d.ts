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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    locale: string | null;
    onboardingComplete: boolean;
    organizationId: string | null;
  }
}
