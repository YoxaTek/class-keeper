"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { Student } from "@prisma/client";
import { cardClass, iconDangerClass } from "@/components/ui/styles";
import { StudentFormDrawer } from "./StudentFormDrawer";
import s from "./roster.module.scss";

type Row = {
  id: string; // enrollment id
  student: Student;
  attendancePct: number;
  scorePct: number;
};

// Each stat is judged on its own number, not the course's overall passing
// threshold — a student can have fine attendance and a weak score (or vice
// versa), and the two pills should say so independently instead of both
// inheriting one combined pass/fail flag.
const HEALTHY_THRESHOLD = 70;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function RosterTable({ courseId, rows }: { courseId: string; rows: Row[] }) {
  const t = useTranslations();
  const router = useRouter();

  async function remove(enrollmentId: string) {
    if (!confirm(t("roster.removeStudent") + "?")) return;
    await fetch(`/api/courses/${courseId}/students/${enrollmentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={s.cards}>
      {rows.map((row) => (
        <div key={row.id} className={`${cardClass} ${s.card}`}>
          <Link href={`/courses/${courseId}/students/${row.id}`} className={s.overlay} aria-label={row.student.name} />
          <div className={s.content}>
            <div className={s.top}>
              <div className={s.avatar}>{initials(row.student.name)}</div>
              <div className={s.who}>
                <p>
                  <span className={s.name}>{row.student.name}</span>
                  {row.student.chineseName && <span className={s.chinese}>{row.student.chineseName}</span>}
                </p>
                {/* No ID assigned yet — omit the row rather than print a bare "-". */}
                {row.student.studentId && <p className={`tabular ${s.id}`}>ID {row.student.studentId}</p>}
              </div>
              <div className={s.actions}>
                <StudentFormDrawer
                  courseId={courseId}
                  enrollmentId={row.id}
                  initialName={row.student.name}
                  initialChineseName={row.student.chineseName ?? ""}
                  initialStudentId={row.student.studentId ?? ""}
                  initialEmail={row.student.email ?? ""}
                />
                <button onClick={() => remove(row.id)} title={t("common.delete")} className={iconDangerClass}>
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </div>

            <div className={s.pills}>
              <span className={`tabular ${s.pill} ${row.attendancePct >= HEALTHY_THRESHOLD ? "" : s.low}`}>
                {t("roster.attendance")} {row.attendancePct}%
              </span>
              <span className={`tabular ${s.pill} ${row.scorePct >= HEALTHY_THRESHOLD ? "" : s.low}`}>
                {t("roster.score")} {row.scorePct}%
              </span>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className={`${cardClass} ${s.empty}`}>—</div>}
    </div>
  );
}
