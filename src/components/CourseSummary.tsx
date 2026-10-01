import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatSchedule, parseSchedule } from "@/lib/schedule";
import s from "./CourseSummary.module.scss";

interface SummaryCourse {
  code: string | null;
  name: string;
  section: string | null;
  room: string | null;
  color: string;
  startDate: Date;
  endDate: Date;
  schedule: unknown; // Course.schedule (JSON) — parsed here
  subject: { name: string };
}

/** Classes for the colored left stripe on a course card — apply to the card element that wraps <CourseSummary />. */
export const courseStripeClass = (color: string) => `${s.stripeCard} ${s[color] ?? s.terracotta}`;

/**
 * The course's identity block, shown on both the course list and the top of
 * a course's Classes tab: code · term, subject and section, enrolled count,
 * meeting days/time and room, and how many of the planned classes have
 * happened. Pure display — callers supply the card around it.
 */
export async function CourseSummary({
  course,
  enrolled,
  conducted,
  planned,
}: {
  course: SummaryCourse;
  enrolled: number;
  conducted: number;
  planned: number;
}) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dayShort = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + day)));
  const shortDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  const scheduleLines = formatSchedule(parseSchedule(course.schedule), dayShort);
  const label = [course.code, course.name].filter(Boolean).join(" · ");
  const progress = planned > 0 ? Math.min(100, Math.round((conducted / planned) * 100)) : 0;

  return (
    <div className={s.summary}>
      <div className={s.top}>
        <div className={s.info}>
          <p className={s.term}>{label}</p>
          <h2 className={s.subject}>
            {course.subject.name}
            {course.section && <span className={s.section}> · {course.section}</span>}
          </h2>
        </div>
        <span className={s.enrolled}>
          <Users aria-hidden />
          {t("enrolledBadge", { count: enrolled })}
        </span>
      </div>

      <div className={s.meta}>
        {/* One row (with its own calendar icon) per distinct meeting time. */}
        <div className={s.rows}>
          {(scheduleLines.length > 0
            ? scheduleLines
            : [`${shortDate.format(course.startDate)} – ${shortDate.format(course.endDate)}`]
          ).map((line) => (
            <span key={line}>
              <CalendarDays aria-hidden />
              <span className="tabular">{line}</span>
            </span>
          ))}
        </div>
        {course.room && (
          <span>
            <MapPin aria-hidden />
            {course.room}
          </span>
        )}
      </div>

      {planned > 0 && (
        <div className={s.progress}>
          <div className={s.progressLabel}>
            <span>{t("classesConducted", { done: conducted, total: planned })}</span>
            <span className="tabular">{progress}%</span>
          </div>
          <div className={s.bar}>
            <div className={s.fill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
