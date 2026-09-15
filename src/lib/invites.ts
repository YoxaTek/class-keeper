import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { assertCanAddTA } from "./subscriptions/gate";

export type InviteRejectionReason =
  | "not_found"
  | "expired"
  | "already_accepted"
  | "email_mismatch"
  | "already_onboarded";

export class InviteError extends Error {
  constructor(public reason: InviteRejectionReason) {
    super(reason);
  }
}

export interface InviteForValidation {
  email: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
}

/** Pure so the acceptance rules are testable without a DB. */
export function validateInvite(
  invite: InviteForValidation | null,
  acceptingEmail: string,
  now: Date = new Date()
): { ok: true } | { ok: false; reason: InviteRejectionReason } {
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.acceptedAt) return { ok: false, reason: "already_accepted" };
  if (invite.expiresAt && invite.expiresAt < now) return { ok: false, reason: "expired" };
  if (invite.email && invite.email.toLowerCase() !== acceptingEmail.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}

/**
 * Applies an accepted invite to the accepting user's own account: sets
 * their role, links them to the org/term/student roster row the invite
 * carries, and marks onboarding complete. Refuses to touch an
 * already-onboarded account — role changes for an established user are an
 * admin action, not something a stray invite link should be able to do.
 */
export async function acceptInvite(userId: string, userEmail: string, token: string): Promise<void> {
  const invite = await prisma.invite.findUnique({ where: { token } });
  const validation = validateInvite(invite, userEmail);
  if (!validation.ok) throw new InviteError(validation.reason);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.onboardingComplete) throw new InviteError("already_onboarded");

  if (invite!.role === "TA" && invite!.termId) {
    // Re-check the plan limit at acceptance time too, not just when the
    // invite was created — it may have sat pending long enough for the
    // inviting teacher's TA count or plan to have changed.
    const term = await prisma.term.findUniqueOrThrow({ where: { id: invite!.termId } });
    await assertCanAddTA(term.teacherId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invite.update({
      where: { id: invite!.id },
      data: { acceptedAt: new Date(), acceptedByUserId: userId },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        role: invite!.role,
        onboardingComplete: true,
        ...(invite!.organizationId ? { organizationId: invite!.organizationId } : {}),
      },
    });

    if (invite!.role === "TA" && invite!.termId) {
      await tx.termAssistant.upsert({
        where: { termId_userId: { termId: invite!.termId, userId } },
        create: { termId: invite!.termId, userId },
        update: {},
      });
    }

    if (invite!.role === "STUDENT" && invite!.studentId) {
      await tx.student.update({ where: { id: invite!.studentId }, data: { userId } });
    }
  });
}

/**
 * The no-invite path: a fresh Google sign-up with no invite token is always
 * a teacher. Institution is optional — leaving it blank just means a solo
 * teacher with no Organization (their plan resolves to their own personal
 * Subscription, same as before this feature existed).
 */
export async function completeBootstrapOnboarding(
  userId: string,
  name: string,
  institutionName: string | null
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.onboardingComplete) throw new InviteError("already_onboarded");

  await prisma.$transaction(async (tx) => {
    let organizationId: string | undefined;
    if (institutionName) {
      const org = await tx.organization.create({ data: { name: institutionName } });
      organizationId = org.id;
    }
    await tx.user.update({
      where: { id: userId },
      data: { name, onboardingComplete: true, ...(organizationId ? { organizationId } : {}) },
    });
  });
}

export interface CreateInviteInput {
  invitedById: string;
  role: Role;
  email?: string;
  termId?: string;
  studentId?: string;
}

/**
 * Only a teacher issues invites, and only for things they actually own:
 * a TEACHER invite joins the inviter's own Organization (they must have
 * one), a TA invite must reference one of the inviter's own terms, and a
 * STUDENT invite must reference an unlinked roster row from one of their
 * own terms.
 */
export async function createInvite(input: CreateInviteInput) {
  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: input.invitedById } });
  if (inviter.role !== "TEACHER") throw new InviteError("not_found"); // not a real invite-issuing account

  if (input.role === "TEACHER") {
    if (!inviter.organizationId) {
      throw new Error("You need an institution set up before inviting a co-teacher. Set one in your profile first.");
    }
    return prisma.invite.create({
      data: {
        role: "TEACHER",
        email: input.email,
        organizationId: inviter.organizationId,
        invitedById: inviter.id,
      },
    });
  }

  if (input.role === "TA") {
    if (!input.termId) throw new Error("termId is required for a TA invite");
    const term = await prisma.term.findUnique({ where: { id: input.termId } });
    if (!term || term.teacherId !== inviter.id) throw new Error("You don't own that term");

    await assertCanAddTA(inviter.id);

    return prisma.invite.create({
      data: { role: "TA", email: input.email, termId: input.termId, invitedById: inviter.id },
    });
  }

  // STUDENT
  if (!input.studentId) throw new Error("studentId is required for a student invite");
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, term: { teacherId: inviter.id } },
    include: { student: true },
  });
  if (!enrollment) throw new Error("That student isn't on any of your rosters");
  if (enrollment.student.userId) throw new Error("That student already has a linked account");

  const existingInvite = await prisma.invite.findUnique({ where: { studentId: input.studentId } });
  if (existingInvite) {
    if (!existingInvite.acceptedAt) throw new Error("An invite for that student is already pending");
    // Accepted but the student row still has no linked user is an
    // inconsistent leftover state (shouldn't normally happen) — clear it so
    // a fresh invite can be issued instead of hitting the unique constraint.
    await prisma.invite.delete({ where: { id: existingInvite.id } });
  }

  return prisma.invite.create({
    data: { role: "STUDENT", email: input.email, studentId: input.studentId, invitedById: inviter.id },
  });
}
