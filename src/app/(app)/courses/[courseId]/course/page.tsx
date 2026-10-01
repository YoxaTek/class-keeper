import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarRange, ChevronRight, GraduationCap, Users } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cardClass } from "@/components/ui/styles";
import { requireCourseAccess } from "@/lib/courseAccess";
import { prisma } from "@/lib/prisma";
import { CourseFormDrawer } from "../../../CourseFormDrawer";
import { CourseDeleteButton } from "../../../CourseDeleteButton";
import { InviteCoTeacherForm } from "../../../InviteCoTeacherForm";
import { InviteTAForm } from "../roster/InviteTAForm";
import f from "@/components/ui/form.module.scss";
import { courseFormInitial } from "@/lib/courseForm";
import s from "./course.module.scss";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user } = await requireCourseAccess(courseId);
  const t = await getTranslations("dashboard");
  const tAll = await getTranslations();
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: { subject: true, _count: { select: { enrollments: true, sessions: true } } },
  });

  const weights = [
    { label: t("weightAttendance"), value: course.weightAttendance },
    { label: t("weightAssignment"), value: course.weightAssignment },
    { label: t("weightQuiz"), value: course.weightQuiz },
    { label: t("weightMidterm"), value: course.weightMidterm },
    { label: t("weightFinal"), value: course.weightFinal },
    { label: t("weightImpression"), value: course.weightImpression },
  ];
  const totalWeight = weights.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={f.stack}>
      <Breadcrumb items={[{ label: t("course") }]} />

      <section className={`${cardClass} ${s.summary}`}>
        <div className={s.header}>
          <div className={s.info}>
            <div>
              <h1 className={f.heading}>{course.subject.name}</h1>
              <p className={f.muted}>{course.name}</p>
            </div>
            <p className={s.dates}>
              {dateFmt.format(course.startDate)} - {dateFmt.format(course.endDate)}
            </p>
            <p className={f.muted}>
              {t("institute")}: <span className={s.strong}>{course.institute || "-"}</span>
            </p>
          </div>

          {course.teacherId === user.id && (
            <div className={s.actions}>
              <CourseFormDrawer
                mode="edit"
                courseId={course.id}
                initial={courseFormInitial(course)}
              />
              <CourseDeleteButton courseId={course.id} courseLabel={`${course.subject.name} · ${course.name}`} />
            </div>
          )}
        </div>
      </section>

      <section className={s.stats}>
        <Link
          href={`/courses/${course.id}/roster`}
          className={`${cardClass} ${s.stat} ${s.statLink}`}
        >
          <p className={s.statHead}>
            <span>
              <Users aria-hidden />
              {t("students")}
            </span>
            <ChevronRight aria-hidden />
          </p>
          <p className={`tabular ${s.value}`}>{course._count.enrollments}</p>
        </Link>

        <Link
          href={`/courses/${course.id}`}
          className={`${cardClass} ${s.stat} ${s.statLink}`}
        >
          <p className={s.statHead}>
            <span>
              <CalendarRange aria-hidden />
              {tAll("sessions.title")}
            </span>
            <ChevronRight aria-hidden />
          </p>
          <p className={`tabular ${s.value}`}>{course._count.sessions}</p>
        </Link>

        <article className={`${cardClass} ${s.stat}`}>
          <p className={`${s.statHead} ${s.muted}`}>
            <GraduationCap aria-hidden />
            {t("passingScore")}
          </p>
          <p className={`tabular ${s.value}`}>{course.passingScore}</p>
        </article>
      </section>

      <section>
        <article className={`${cardClass} ${f.pad}`}>
          <div className={s.weightsHead}>
            <h2 className={s.weightsTitle}>{t("weights")}</h2>
            <span
              className={`tabular ${s.total} ${totalWeight === 100 ? s.full : s.partial}`}
            >
              {totalWeight}/100
            </span>
          </div>
          {weights.map((weight) => (
            <div key={weight.label} className={s.weight}>
              <p>{weight.label}</p>
              <p className="tabular">{weight.value}%</p>
            </div>
          ))}
        </article>
      </section>

      {user.role === "TEACHER" && (
        <section className={s.invites}>
          <InviteTAForm courseId={course.id} />
          {user.organizationId && <InviteCoTeacherForm />}
        </section>
      )}
    </div>
  );
}