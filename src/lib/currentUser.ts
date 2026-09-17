import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  image: string | null;
  onboardingComplete: boolean;
  organizationId: string | null;
}

/**
 * The session JWT's role/onboardingComplete/name/image are only re-minted on
 * sign-in or an explicit client-side session update — they go stale the
 * moment a role changes (accepting an invite), onboarding completes, or a
 * profile edit happens in the same visit. Every (app)-route page/layout must
 * read these fields from here, never from session.user directly, or it'll
 * gate a redirect or a button against last-login's role instead of the
 * current one. Wrapped in React's cache() so a layout and the page it
 * renders share one DB query per request instead of each fetching it
 * separately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  if (!session) redirect("/login");

  return prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      image: true,
      onboardingComplete: true,
      organizationId: true,
    },
  });
});

/**
 * The terms a staff (teacher/TA) user can switch between, for the header's
 * term selector and term-scoped breadcrumbs. Wrapped in cache() so the
 * layout and the page it renders share one query per request.
 */
export const getStaffTerms = cache(async (): Promise<{ id: string; label: string }[]> => {
  const user = await getCurrentUser();
  const terms = await prisma.term.findMany({
    where: user.role === "TEACHER" ? { teacherId: user.id } : { assistants: { some: { userId: user.id } } },
    include: { subject: true },
    orderBy: { startDate: "desc" },
  });
  return terms.map((term) => ({ id: term.id, label: `${term.name} · ${term.subject.name}` }));
});
