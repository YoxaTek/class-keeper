import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAcceptableInviteContext, tryAcceptAdditionalTaCourse } from "@/lib/invites";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";
import { InviteAcceptForm } from "./InviteAcceptForm";
import { InviteEntryForm } from "./InviteEntryForm";
import { JoinForm } from "./JoinForm";

// The single place any invite (TEACHER/TA/STUDENT via a token) or class
// join (self-serve by name + student ID) gets accepted — reachable whether
// or not onboarding has run yet (unlike the rest of the app, this isn't
// gated behind it), and reachable on its own from inside the app, not just
// via the original link. See src/lib/invites.ts for the acceptance rules.
export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; course?: string; studentId?: string }>;
}) {
  const { token, course: courseId, studentId } = await searchParams;

  const selfParams = new URLSearchParams();
  if (token) selfParams.set("token", token);
  if (courseId) selfParams.set("course", courseId);
  const selfUrl = `/invites${selfParams.size ? `?${selfParams.toString()}` : ""}`;

  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(selfUrl)}`);

  const t = await getTranslations("invites");
  const tCommon = await getTranslations("common");
  const tInvite = await getTranslations("invite");
  const tJoin = await getTranslations("join");

  // ---- Token invite (TEACHER / TA / STUDENT-with-a-linked-roster-row) ----
  if (token) {
    // An existing TA picking up another course from the same or a
    // different teacher needs nothing else from them — apply immediately
    // and go straight to the dashboard rather than show a form.
    if (await tryAcceptAdditionalTaCourse(session.user.id, session.user.email!, token)) {
      redirect("/");
    }

    const result = await getAcceptableInviteContext(token, session.user.id, session.user.email!);
    const invite = "invite" in result ? result.invite : null;
    const inviteError = "error" in result ? result.error : null;

    return (
      <AuthShell appName={tCommon("appName")}>
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{tInvite("title")}</h1>
          </div>

          {inviteError && (
            <div className="space-y-2">
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {t(`error.${inviteError}`)}
              </p>
              <Link href="/" className={linkClass}>
                {tCommon("home")}
              </Link>
            </div>
          )}

          {!inviteError && invite && <InviteAcceptForm token={token} invite={invite} />}
        </div>
      </AuthShell>
    );
  }

  // ---- Class join by name + student ID ----
  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, name: true, institute: true, subject: { select: { name: true } } },
    });
    if (!course) notFound();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, _count: { select: { coursesTaught: true, taAssignments: true } } },
    });
    // Same rule the join API enforces — surfaced here too so the form
    // doesn't render only to fail on submit. An empty (never-used) teacher
    // account has zero courses taught, so it still passes.
    const alreadyTeaches = user._count.coursesTaught > 0 || user._count.taAssignments > 0;

    return (
      <AuthShell appName={tCommon("appName")}>
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{tJoin("title")}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              {course.subject.name} · {course.name}
              {course.institute && ` · ${course.institute}`}
            </p>
          </div>

          {alreadyTeaches ? (
            <p className="text-sm text-red-600 dark:text-red-400">{tJoin("alreadyTeaching")}</p>
          ) : (
            <JoinForm courseId={course.id} initialName={user.name ?? ""} initialStudentId={studentId ?? ""} />
          )}
        </div>
      </AuthShell>
    );
  }

  // ---- No token/course in the URL: manual entry ----
  return (
    <AuthShell appName={tCommon("appName")}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("entryTitle")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{t("entrySubtitle")}</p>
        </div>
        <InviteEntryForm />
      </div>
    </AuthShell>
  );
}
