import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { cardClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import s from "./feedback.module.scss";

// Every end-of-course comment students have submitted, newest first, for the
// courses this teacher owns or TAs.
export default async function FeedbackPage() {
  const { id: userId, role } = await getCurrentUser();
  if (role === "STUDENT") redirect("/me");

  const feedback = await prisma.feedback.findMany({
    where: {
      enrollment: {
        course: role === "TEACHER" ? { teacherId: userId } : { assistants: { some: { userId } } },
      },
    },
    include: { enrollment: { include: { student: true, course: { include: { subject: true } } } } },
    orderBy: { submittedAt: "desc" },
  });

  const t = await getTranslations("feedbackList");
  const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className={s.page}>
      <h1 className={f.pageTitle}>{t("title")}</h1>

      {feedback.length === 0 ? (
        <p className={`${cardClass} ${s.empty}`}>{t("empty")}</p>
      ) : (
        <ul className={s.list}>
          {feedback.map((item) => {
            const { student, course } = item.enrollment;
            return (
              <li key={item.id} className={`${cardClass} ${s.item}`}>
                <div className={s.head}>
                  <div>
                    <p className={s.student}>
                      {student.name}
                      {student.chineseName && <span className={s.chinese}>{student.chineseName}</span>}
                    </p>
                    <p className={s.course}>
                      {course.subject.name} · {course.name}
                    </p>
                  </div>
                  <time className={`tabular ${s.date}`} dateTime={item.submittedAt.toISOString()}>
                    {dateFmt.format(item.submittedAt)}
                  </time>
                </div>
                <p className={s.comment}>{item.comment}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
