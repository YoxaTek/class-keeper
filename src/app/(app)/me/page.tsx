import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookMarked, BookOpenText, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import f from "@/components/ui/form.module.scss";
import { cardHoverClass } from "@/components/ui/styles";
import s from "./me.module.scss";

export default async function MePage() {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") redirect("/");

  const t = await getTranslations("studentView");
  const tDashboard = await getTranslations("dashboard");
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      enrollments: {
        include: { course: { include: { subject: true } } },
        orderBy: { course: { startDate: "desc" } },
      },
    },
  });

  if (!student) {
    return <p className={f.muted}>{t("noProfile")}</p>;
  }

  return (
    <div className={s.page}>
      <h1 className={f.pageTitle}>{t("myCourses")}</h1>

      {student.enrollments.length > 0 ? (
        <div className={s.grid}>
          {student.enrollments.map((enrollment) => {
            const { course } = enrollment;
            return (
              <Link
                key={enrollment.id}
                href={`/me/${enrollment.id}`}
                className={`${cardHoverClass} ${s.courseCard}`}
              >
                <div>
                  <p className={s.label}>
                    <BookMarked aria-hidden />
                    {tDashboard("course")}
                  </p>
                  <p className={s.courseName}>{course.name}</p>
                </div>
                <div>
                  <p className={s.label}>
                    <BookOpenText aria-hidden />
                    {tDashboard("subject")}
                  </p>
                  <p className={s.subject}>{course.subject.name}</p>
                </div>
                <div>
                  <p className={s.label}>
                    <CalendarDays aria-hidden />
                    {tDashboard("dates")}
                  </p>
                  <p className={`tabular ${s.dates}`}>
                    {dateFmt.format(course.startDate)} – {dateFmt.format(course.endDate)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={s.empty}>
          {t("noCourses")}
        </div>
      )}
    </div>
  );
}
