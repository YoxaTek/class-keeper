import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateInvite } from "@/lib/invites";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "./OnboardingForm";

async function loadInviteContext(token: string, acceptingEmail: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      invitedBy: { select: { name: true, email: true } },
      organization: { select: { name: true } },
      term: { select: { name: true, subject: { select: { name: true } } } },
      student: {
        select: {
          enrollments: {
            take: 1,
            select: { term: { select: { name: true, subject: { select: { name: true } } } } },
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
    context = invite.term ? `${invite.term.subject.name} · ${invite.term.name}` : "";
  } else {
    const enrollment = invite.student?.enrollments[0];
    context = enrollment ? `${enrollment.term.subject.name} · ${enrollment.term.name}` : "";
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

  // Same reasoning as (app)/layout.tsx: the session cookie's
  // onboardingComplete can be stale, so check the DB directly.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { onboardingComplete: true },
  });
  if (user.onboardingComplete) redirect("/");

  const { invite: inviteToken } = await searchParams;
  const t = await getTranslations("onboarding");
  const tCommon = await getTranslations("common");

  let inviteContext: Awaited<ReturnType<typeof loadInviteContext>>["invite"] = null;
  let inviteError: string | null = null;

  if (inviteToken) {
    const result = await loadInviteContext(inviteToken, session.user.email!);
    inviteContext = result.invite;
    inviteError = result.error;
  }

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          {!inviteToken && <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("bootstrapSubtitle")}</p>}
        </div>

        {inviteError && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {t(`inviteError.${inviteError}`)}
          </p>
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
