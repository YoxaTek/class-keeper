import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "./OnboardingForm";

// Bootstrap-only: this always creates a TEACHER account, full stop — every
// invite/join case (TA, student, an existing TA picking up another course,
// or an empty account converting) is handled by /invites instead, which
// works whether or not onboarding has run yet. See src/lib/invites.ts.
//
// The live email/password signup form now collects name + institution and
// finishes onboarding itself (see /api/signup), so this page is unreached
// in that flow — it stays only as a fallback for a signed-in but
// not-yet-onboarded account with no name/institution on file (e.g. an
// OAuth provider's profile() callback, none of which are enabled today).
export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { onboardingComplete: true },
  });
  if (user.onboardingComplete) redirect("/");

  const t = await getTranslations("onboarding");
  const tCommon = await getTranslations("common");

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("bootstrapSubtitle")}</p>
        </div>

        <OnboardingForm initialName={session.user.name ?? ""} />
      </div>
    </AuthShell>
  );
}
