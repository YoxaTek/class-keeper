import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { safeCallbackUrl } from "@/lib/safeCallbackUrl";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { joinCourseLabel } from "@/lib/joinCourseLabel";
import { SignupForm } from "./SignupForm";
import f from "@/components/ui/form.module.scss";

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
  const joinCourse = await joinCourseLabel(safeUrl);
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
      <div className={f.stack}>
        <div className={f.field}>
          <h1 className={f.heading}>{t("title")}</h1>
          <p className={f.muted}>{t("subtitle")}</p>
        </div>

        {joinCourse && <p className={f.notice}>{t("joinCourseBanner", { course: joinCourse })}</p>}

        <SignupForm providers={providers} callbackUrl={safeUrl} initialInstitution={initialInstitution} />
      </div>
    </AuthShell>
  );
}
