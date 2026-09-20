import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateInvite } from "@/lib/invites";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";
import { OnboardingForm } from "./OnboardingForm";

async function loadInviteContext(token: string, acceptingEmail: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      invitedBy: { select: { name: true, email: true } },
      organization: { select: { name: true } },
      course: { select: { name: true, subject: { select: { name: true } } } },
      student: {
        select: {
          enrollments: {
            take: 1,
            select: { course: { select: { name: true, subject: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  const validation = validateInvite(invite, acceptingEmail);
  if (!invite || !validation.ok) {
    return { invite: null, error: !validation.ok ? validation.reason : ("not_found" as const) };
  }

  let context: string;
  if (invite.role === "TEACHER") {
    context = invite.organization?.name ?? "";
  } else if (invite.role === "TA") {
    context = invite.course ? `${invite.course.subject.name} · ${invite.course.name}` : "";
  } else {
    const enrollment = invite.student?.enrollments[0];
    context = enrollment ? `${enrollment.course.subject.name} · ${enrollment.course.name}` : "";
  }

  return {
    invite: {
      role: invite.role,
      invitedByName: invite.invitedBy.name ?? invite.invitedBy.email,
      context,
    },
    error: null,
  };
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { invite: inviteToken } = await searchParams;

  // Same reasoning as (app)/layout.tsx: the session cookie's
  // onboardingComplete can be stale, so check the DB directly. An
  // already-onboarded account visiting a bare /onboarding just belongs on
  // the dashboard, but one that followed an invite link needs to see why
  // it didn't apply (acceptInvite refuses to touch an established
  // account) rather than being silently bounced with no explanation.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true, onboardingComplete: true },
  });
  if (user.onboardingComplete && !inviteToken) redirect("/");

  const t = await getTranslations("onboarding");
  const tCommon = await getTranslations("common");

  let inviteContext: Awaited<ReturnType<typeof loadInviteContext>>["invite"] = null;
  let inviteError: string | null = null;

  if (inviteToken) {
    const result = await loadInviteContext(inviteToken, session.user.email!);
    inviteContext = result.invite;
    inviteError = result.error;

    // The invite itself checks out, but acceptInvite() refuses to change
    // role/org on an account that's already set up — surface that instead
    // of letting the form render an action that will fail. The one
    // exception is an existing TA picking up another TA invite (another
    // course); the invite landing page normally fast-paths that case
    // straight home, so reaching the form here only happens as a fallback
    // (e.g. a direct link) — acceptInvite() itself allows it.
    const isAdditionalTaCourse = inviteContext?.role === "TA" && user.role === "TA";
    if (!inviteError && user.onboardingComplete && !isAdditionalTaCourse) {
      inviteContext = null;
      inviteError = "already_onboarded";
    }
  }

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          {!inviteToken && <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("bootstrapSubtitle")}</p>}
        </div>

        {inviteError && (
          <div className="space-y-2">
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {t(`inviteError.${inviteError}`)}
            </p>
            {inviteError === "already_onboarded" && (
              <Link href="/" className={linkClass}>
                {tCommon("home")}
              </Link>
            )}
          </div>
        )}

        {(!inviteToken || inviteContext) && (
          <OnboardingForm
            initialName={session.user.name ?? ""}
            inviteToken={inviteToken}
            invite={inviteContext}
          />
        )}
      </div>
    </AuthShell>
  );
}
