import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Session strategy is JWT (required for Credentials login), so the
  // adapter's own Session table is never read from or written to —
  // it's only used here for User/Account bookkeeping.
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locale: user.locale,
          onboardingComplete: user.onboardingComplete,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role as Role;
        token.locale = user.locale as string | null;
        token.onboardingComplete = user.onboardingComplete;
        token.organizationId = user.organizationId;
      } else if (trigger === "update" && token.sub) {
        // Onboarding completion (or any later profile change) happens after
        // the JWT was minted, so the client explicitly triggers a refresh
        // via useSession().update() — re-read the current values from the DB.
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, locale: true, onboardingComplete: true, organizationId: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.locale = fresh.locale;
          token.onboardingComplete = fresh.onboardingComplete;
          token.organizationId = fresh.organizationId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale as string | null;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
});
