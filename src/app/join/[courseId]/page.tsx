import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEnabledProviders } from "@/lib/authProviders";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";

// Just a course-capturing landing page — /invites owns the actual join
// form and its rules, so a signed-in visitor goes straight there.
export default async function JoinCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, name: true, institute: true, subject: { select: { name: true } } },
  });
  if (!course) notFound();

  const target = `/invites?course=${encodeURIComponent(courseId)}`;

  const session = await auth();
  if (session) redirect(target);

  const t = await getTranslations("join");
  const tCommon = await getTranslations("common");
  const tLogin = await getTranslations("login");
  const tSignup = await getTranslations("signup");
  const providers = getEnabledProviders();
  const callbackParam = `callbackUrl=${encodeURIComponent(target)}`;

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {course.subject.name} · {course.name}
            {course.institute && ` · ${course.institute}`}
          </p>
        </div>
        <ProviderSignInButtons providers={providers} callbackUrl={target} />
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          {tLogin("or")}
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <Link href={`/login?${callbackParam}`} className={linkClass}>
            {tLogin("submit")}
          </Link>
          {" · "}
          <Link href={`/signup?${callbackParam}`} className={linkClass}>
            {tSignup("submit")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
