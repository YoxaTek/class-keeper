"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, CalendarDays, Check, Clock, MapPin, Minus, Pencil, Percent, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Drawer } from "@/components/ui/Drawer";
import { inputClass, inputClassSm, labelClass, iconButtonClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";
import { COURSE_COLORS } from "@/lib/validation/course";
import { countPlannedSessions } from "@/lib/plannedSessions";
import { EMPTY_COURSE_FORM, type CourseFormFields } from "@/lib/courseForm";
import s from "./CourseFormDrawer.module.scss";

// Week starts on Monday in the picker; values are JS weekdays (0 = Sunday).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function sliderFillStyle(value: number, min: number, max: number) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = ((clamped - min) / (max - min || 1)) * 100;
  return {
    background:
      `linear-gradient(to right, ` +
      `var(--slider-track-filled) 0%, var(--slider-track-filled) ${pct}%, ` +
      `var(--slider-track-empty) ${pct}%, var(--slider-track-empty) 100%)`,
  };
}

type Props =
  | { mode: "create"; triggerLabel?: string; triggerClassName?: string }
  | { mode: "edit"; courseId: string; initial: CourseFormFields };

export function CourseFormDrawer(props: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initial = props.mode === "edit" ? props.initial : EMPTY_COURSE_FORM;

  const [subjectName, setSubjectName] = useState(initial.subjectName);
  const [name, setName] = useState(initial.name);
  const [code, setCode] = useState(initial.code);
  const [section, setSection] = useState(initial.section);
  const [color, setColor] = useState(initial.color);
  const [institute, setInstitute] = useState(initial.institute);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [plannedSessions, setPlannedSessions] = useState(initial.plannedSessions);
  const [weekdays, setWeekdays] = useState<number[]>(initial.weekdays);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [room, setRoom] = useState(initial.room);
  const [weights, setWeights] = useState({
    weightAttendance: initial.weightAttendance,
    weightAssignment: initial.weightAssignment,
    weightQuiz: initial.weightQuiz,
    weightMidterm: initial.weightMidterm,
    weightFinal: initial.weightFinal,
    weightImpression: initial.weightImpression,
  });
  const [maxExcusedAbsences, setMaxExcusedAbsences] = useState(initial.maxExcusedAbsences);
  const [passingScore, setPassingScore] = useState(initial.passingScore);
  const [error, setError] = useState<string | null>(null);

  const dateRangeError =
    startDate && endDate && endDate < startDate ? "End date must be on or after start date." : null;
  const weightTotal = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const weightError = weightTotal !== 100 ? `Grading weights must add up to 100 (currently ${weightTotal}).` : null;

  // Weekday names from the browser's own locale data — no translation keys.
  const weekdayName = (day: number, style: "narrow" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + day)));

  // The class total follows the schedule: whenever the dates or the weekly
  // days change, recount (the +/− stepper can still fine-tune it afterwards).
  function recount(start: string, end: string, days: number[]) {
    const count = countPlannedSessions(start, end, days);
    if (count !== null) setPlannedSessions(count);
  }

  function changeStartDate(value: string) {
    setStartDate(value);
    recount(value, endDate, weekdays);
  }

  function changeEndDate(value: string) {
    setEndDate(value);
    recount(startDate, value, weekdays);
  }

  function toggleWeekday(day: number) {
    const next = weekdays.includes(day) ? weekdays.filter((d) => d !== day) : [...weekdays, day];
    setWeekdays(next);
    recount(startDate, endDate, next);
  }

  function updateWeight(key: keyof typeof weights, value: number) {
    setWeights((w) => ({ ...w, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (dateRangeError || weightError) {
      setSubmitting(false);
      setError(dateRangeError ?? weightError);
      return;
    }

    const url = props.mode === "edit" ? `/api/courses/${props.courseId}` : "/api/courses";
    const res = await fetch(url, {
      method: props.mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subjectName,
        startDate,
        endDate,
        maxExcusedAbsences,
        passingScore,
        institute: institute.trim() || null,
        code: code.trim() || null,
        section: section.trim() || null,
        room: room.trim() || null,
        weekdays,
        startTime: startTime || null,
        endTime: endTime || null,
        plannedSessions,
        color,
        ...weights,
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not save the course.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    if (props.mode === "edit") {
      return (
        <button onClick={() => setOpen(true)} title={tc("edit")} className={iconButtonClass}>
          <Pencil size={14} aria-hidden />
        </button>
      );
    }
    return (
      <Button variant="primary" onClick={() => setOpen(true)} className={props.triggerClassName ?? s.nowrap}>
        <Plus size={16} aria-hidden />
        {props.triggerLabel ?? t("createCourse")}
      </Button>
    );
  }

  return (
    <Drawer
      title={props.mode === "edit" ? t("editTitle") : t("createTitle")}
      onClose={() => setOpen(false)}
      footer={
        <div className={f.actions}>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            form="course-form"
            variant="primary"
            disabled={submitting || !!dateRangeError || !!weightError}
          >
            {tc("save")}
          </Button>
        </div>
      }
    >
      <form id="course-form" onSubmit={onSubmit} className={f.form}>
        {/* ---- 1. course details ---- */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <BookOpen size={16} aria-hidden />
            {t("courseDetails")}
          </h3>

          <div className={f.field}>
            <label className={labelClass}>{t("subject")}</label>
            <input
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Chinese — Basic"
              className={inputClass}
            />
          </div>

          <div className={f.grid2}>
            <div className={f.field}>
              <label className={labelClass}>{t("courseCode")}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CHI-101" className={inputClass} />
            </div>
            <div className={f.field}>
              <label className={labelClass}>{t("section")}</label>
              <input value={section} onChange={(e) => setSection(e.target.value)} className={inputClass} />
            </div>
            <div className={f.field}>
              <label className={labelClass}>{t("term")}</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 114-2"
                className={inputClass}
              />
            </div>
            <div className={f.field}>
              <label className={labelClass}>{t("institute")}</label>
              <input
                value={institute}
                onChange={(e) => setInstitute(e.target.value)}
                placeholder={t("institutePlaceholder")}
                className={inputClass}
              />
            </div>
          </div>

          <div className={f.field}>
            <label className={labelClass}>{t("binderColor")}</label>
            <div className={s.swatches} role="radiogroup" aria-label={t("binderColor")}>
              {COURSE_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={color === option}
                  aria-label={t(`color_${option}`)}
                  title={t(`color_${option}`)}
                  onClick={() => setColor(option)}
                  className={`${s.swatch} ${s[option]} ${color === option ? s.picked : ""}`}
                >
                  {color === option && <Check size={14} aria-hidden />}
                </button>
              ))}
              <span className={s.swatchName}>{t(`color_${color}`)}</span>
            </div>
          </div>
        </section>

        {/* ---- 2. planned sessions & schedule ---- */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <CalendarDays size={16} aria-hidden />
            {t("scheduleTitle")}
          </h3>

          <div className={s.counter}>
            <span className={labelClass}>{t("plannedSessions")}</span>
            <div className={s.counterRow}>
              <button
                type="button"
                className={s.step}
                aria-label="−"
                onClick={() => setPlannedSessions((n) => Math.max(0, n - 1))}
              >
                <Minus size={16} aria-hidden />
              </button>
              <div className={s.count}>
                <strong className="tabular">{plannedSessions}</strong>
                <span>{t("classesUnit")}</span>
              </div>
              <button
                type="button"
                className={s.step}
                aria-label="+"
                onClick={() => setPlannedSessions((n) => Math.min(200, n + 1))}
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div className={f.field}>
            <label className={labelClass}>{t("weekdays")}</label>
            <div className={s.days}>
              {WEEK_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={weekdays.includes(day)}
                  aria-label={weekdayName(day, "long")}
                  onClick={() => toggleWeekday(day)}
                  className={`${s.day} ${weekdays.includes(day) ? s.picked : ""}`}
                >
                  {weekdayName(day, "narrow")}
                </button>
              ))}
            </div>
          </div>

          <div className={f.grid2}>
            <div className={f.field}>
              <label className={labelClass}>
                <Clock size={12} aria-hidden /> {t("startTime")}
              </label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
            <div className={f.field}>
              <label className={labelClass}>
                <Clock size={12} aria-hidden /> {t("endTime")}
              </label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className={f.field}>
            <label className={labelClass}>
              <MapPin size={12} aria-hidden /> {t("room")}
            </label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} />
          </div>

          <div className={f.grid2}>
            <div className={`${f.field} ${f.minW0}`}>
              <label className={labelClass}>{t("startDate")}</label>
              <DateInput value={startDate} onChange={changeStartDate} max={endDate || undefined} required />
            </div>
            <div className={`${f.field} ${f.minW0}`}>
              <label className={labelClass}>{t("endDate")}</label>
              <DateInput value={endDate} onChange={changeEndDate} min={startDate || undefined} required />
            </div>
          </div>
        </section>

        {/* ---- 3. gradebook scheme ---- */}
        <section className={s.section}>
          <h3 className={`${s.sectionTitle} ${s.between}`}>
            <span className={s.titleText}>
              <Percent size={16} aria-hidden />
              {t("weights")}
            </span>
            <span className={`tabular ${s.total} ${weightError ? s.bad : ""}`}>{weightTotal}/100</span>
          </h3>

          <div className={f.stackXs}>
            {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
              <div key={key} className={s.weightRow}>
                <label className={labelClass}>{t(key)}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[key]}
                  onChange={(e) => updateWeight(key, Number(e.target.value))}
                  className={s.slider}
                  style={sliderFillStyle(weights[key], 0, 100)}
                />
                <div className={f.control}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[key]}
                    onChange={(e) => updateWeight(key, Number(e.target.value))}
                    className={`${inputClassSm} tabular ${f.padEnd}`}
                  />
                  <span className={f.suffix}>%</span>
                </div>
              </div>
            ))}
          </div>

          <div className={f.grid2}>
            <div className={f.field}>
              <label className={labelClass}>{t("maxExcusedAbsences")}</label>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={maxExcusedAbsences}
                onChange={(e) => setMaxExcusedAbsences(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className={f.field}>
              <label className={labelClass}>{t("passingScore")}</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {(dateRangeError ?? weightError ?? error) && (
          <p className={f.error}>{dateRangeError ?? weightError ?? error}</p>
        )}
      </form>
    </Drawer>
  );
}
