import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook, { type FacebookProfile } from "next-auth/providers/facebook";
import Line, { type LineProfile } from "next-auth/providers/line";
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
  // No NEXTAUTH_URL is set (see .env.local), so OAuth redirect_uris are
  // built from the actual request's Host header — required to work both
  // from localhost and from another device on the LAN.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      // A small fraction of Facebook accounts (phone-only signup) have no
      // email on file — User.email is required, so synthesize a stable
      // fallback rather than let account creation fail outright. The
      // role/locale/onboardingComplete/organizationId fields only matter for
      // first-time account creation (an existing user's real DB row is what
      // gets used on every later sign-in) — they mirror the schema's own
      // defaults, just made explicit to satisfy the augmented User type.
      profile(profile: FacebookProfile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email ?? `facebook-${profile.id}@users.noreply.classkeeper`,
          image: profile.picture?.data?.url,
          role: "TEACHER" as const,
          locale: null,
          onboardingComplete: false,
          organizationId: null,
        };
      },
    }),
    Line({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
      // LINE only returns an email once the channel has separately applied
      // for and been granted "Email address permission" in the LINE
      // Developers console — until then (or if the user declines it),
      // there's no email at all. Same fallback as Facebook above.
      profile(profile: LineProfile & { email?: string }) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email ?? `line-${profile.sub}@users.noreply.classkeeper`,
          image: profile.picture,
          role: "TEACHER" as const,
          locale: null,
          onboardingComplete: false,
          organizationId: null,
        };
      },
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
