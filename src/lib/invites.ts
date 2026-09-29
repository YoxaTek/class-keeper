import type { Role, User } from "@prisma/client";
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
 * A TEACHER account that completed bootstrap onboarding but never actually
 * did anything with it (no courses created) — the common shape of "signed
 * up before their TA/student invite arrived." Safe to let an invite convert,
 * unlike an account with real state, since there's nothing to lose.
 */
export async function isEmptyTeacherAccount(user: Pick<User, "role" | "onboardingComplete" | "id">): Promise<boolean> {
  if (user.role !== "TEACHER" || !user.onboardingComplete) return false;
  const coursesTaught = await prisma.course.count({ where: { teacherId: user.id } });
  return coursesTaught === 0;
}

/**
 * Applies an accepted invite to the accepting user's own account: sets
 * their role, links them to the org/course/student roster row the invite
 * carries, and marks onboarding complete. Refuses to touch an
 * already-onboarded account — role changes for an established user are an
 * admin action, not something a stray invite link should be able to do.
 *
 * Two exceptions, both applied directly with no extra confirmation step:
 * - A TA accepting another TA invite: a teacher can assign the same TA to
 *   several of their courses, each as its own invite, so an existing TA
 *   picking up one more course isn't a role change at all — just another
 *   CourseAssistant row.
 * - An empty TEACHER account (see isEmptyTeacherAccount): there's nothing
 *   real being lost, so this converts it the same way a fresh signup would
 *   have, instead of refusing.
 */
export async function acceptInvite(userId: string, userEmail: string, token: string): Promise<void> {
  const invite = await prisma.invite.findUnique({ where: { token } });
  const validation = validateInvite(invite, userEmail);
  if (!validation.ok) throw new InviteError(validation.reason);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const isAdditionalTaCourse = invite!.role === "TA" && user.role === "TA" && user.onboardingComplete;
  if (user.onboardingComplete && !isAdditionalTaCourse && !(await isEmptyTeacherAccount(user))) {
    throw new InviteError("already_onboarded");
  }

  if (invite!.role === "TA" && invite!.courseId) {
    // Re-check the plan limit at acceptance time too, not just when the
    // invite was created — it may have sat pending long enough for the
    // inviting teacher's TA count or plan to have changed.
    const course = await prisma.course.findUniqueOrThrow({ where: { id: invite!.courseId } });
    await assertCanAddTA(course.teacherId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invite.update({
      where: { id: invite!.id },
      data: { acceptedAt: new Date(), acceptedByUserId: userId },
    });

    if (!isAdditionalTaCourse) {
      await tx.user.update({
        where: { id: userId },
        data: {
          role: invite!.role,
          onboardingComplete: true,
          ...(invite!.organizationId ? { organizationId: invite!.organizationId } : {}),
        },
      });
    }

    if (invite!.role === "TA" && invite!.courseId) {
      await tx.courseAssistant.upsert({
        where: { courseId_userId: { courseId: invite!.courseId, userId } },
        create: { courseId: invite!.courseId, userId },
        update: {},
      });
    }

    if (invite!.role === "STUDENT" && invite!.studentId) {
      await tx.student.update({ where: { id: invite!.studentId }, data: { userId } });
    }
  });
}

const courseLabel = (c: { name: string; institute: string | null; subject: { name: string } }) =>
  [c.subject.name, c.name, c.institute].filter(Boolean).join(" · ");

export interface InviteContext {
  role: Role;
  invitedByName: string;
  context: string;
}

/**
 * The human-readable side of an invite — who sent it and what it's for —
 * without touching acceptance eligibility at all. Shared by the /invites
 * page and the QR-scanner's in-place preview (GET /api/invites/[token]),
 * so both describe the same invite the same way.
 */
export async function loadInviteContext(
  token: string,
  acceptingEmail: string
): Promise<{ invite: InviteContext; error: null } | { invite: null; error: InviteRejectionReason }> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      invitedBy: { select: { name: true, email: true } },
      organization: { select: { name: true } },
      course: { select: { name: true, institute: true, subject: { select: { name: true } } } },
      student: {
        select: {
          enrollments: {
            take: 1,
            select: { course: { select: { name: true, institute: true, subject: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  const validation = validateInvite(invite, acceptingEmail);
  if (!invite || !validation.ok) {
    return { invite: null, error: !validation.ok ? validation.reason : "not_found" };
  }

  let context: string;
  if (invite.role === "TEACHER") {
    context = invite.organization?.name ?? "";
  } else if (invite.role === "TA") {
    context = invite.course ? courseLabel(invite.course) : "";
  } else {
    const enrollment = invite.student?.enrollments[0];
    context = enrollment ? courseLabel(enrollment.course) : "";
  }

  return {
    invite: { role: invite.role, invitedByName: invite.invitedBy.name ?? invite.invitedBy.email, context },
    error: null,
  };
}

/**
 * loadInviteContext plus the same eligibility rule acceptInvite() enforces
 * (already-onboarded refusal, with its two exceptions) — read-only, so it's
 * safe to call just to decide what to show before the user has clicked
 * anything, unlike tryAcceptAdditionalTaCourse which mutates as a side
 * effect. The actual accept always happens through acceptInvite() itself.
 */
export async function getAcceptableInviteContext(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ invite: InviteContext } | { error: InviteRejectionReason }> {
  const { invite, error } = await loadInviteContext(token, userEmail);
  if (error) return { error };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, role: true, onboardingComplete: true },
  });
  const isAdditionalTaCourse = invite.role === "TA" && user.role === "TA" && user.onboardingComplete;
  if (user.onboardingComplete && !isAdditionalTaCourse && !(await isEmptyTeacherAccount(user))) {
    return { error: "already_onboarded" };
  }

  return { invite };
}

/**
 * For a signed-in, already-onboarded TA opening a fresh TA invite (another
 * course from the same or a different teacher) there's nothing left to ask
 * them — no name, no onboarding step — so the invite landing page applies
 * it immediately and sends them straight to the dashboard instead of
 * routing them through /onboarding. Returns whether it did so; false
 * (touching nothing) for every other case, which leaves /onboarding to run
 * its normal form-or-error flow.
 */
export async function tryAcceptAdditionalTaCourse(userId: string, userEmail: string, token: string): Promise<boolean> {
  const invite = await prisma.invite.findUnique({ where: { token }, select: { role: true } });
  if (!invite || invite.role !== "TA") return false;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, onboardingComplete: true } });
  if (!user || user.role !== "TA" || !user.onboardingComplete) return false;

  try {
    await acceptInvite(userId, userEmail, token);
    return true;
  } catch {
    return false;
  }
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
  courseId?: string;
  studentId?: string;
}

/**
 * Only a teacher issues invites, and only for things they actually own:
 * a TEACHER invite joins the inviter's own Organization (they must have
 * one), a TA invite must reference one of the inviter's own courses, and a
 * STUDENT invite must reference an unlinked roster row from one of their
 * own courses.
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
    if (!input.courseId) throw new Error("courseId is required for a TA invite");
    const course = await prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course || course.teacherId !== inviter.id) throw new Error("You don't own that course");

    await assertCanAddTA(inviter.id);

    return prisma.invite.create({
      data: { role: "TA", email: input.email, courseId: input.courseId, invitedById: inviter.id },
    });
  }

  // STUDENT
  if (!input.studentId) throw new Error("studentId is required for a student invite");
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, course: { teacherId: inviter.id } },
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
