import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { safeCallbackUrl } from "@/lib/safeCallbackUrl";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const t = await getTranslations("signup");
  const tCommon = await getTranslations("common");
  const providers = getEnabledProviders();
  const { callbackUrl } = await searchParams;

  const safeUrl = safeCallbackUrl(callbackUrl);
  const params = new URL(safeUrl, "http://x").searchParams;
  const courseId = params.get("course");
  const token = params.get("token");
  // Prefill Institute from the course the invite/join link points at.
  let initialInstitution = "";
  if (courseId) {
    initialInstitution = (await prisma.course.findUnique({ where: { id: courseId }, select: { institute: true } }))?.institute ?? "";
  } else if (token) {
    const invite = await prisma.invite.findUnique({
      where: { token },
      select: { course: { select: { institute: true } }, student: { select: { enrollments: { take: 1, select: { course: { select: { institute: true } } } } } } },
    });
    initialInstitution = (invite?.course ?? invite?.student?.enrollments[0]?.course)?.institute ?? "";
  }

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("subtitle")}</p>
        </div>

        <SignupForm providers={providers} callbackUrl={safeUrl} initialInstitution={initialInstitution} />
      </div>
    </AuthShell>
  );
}
