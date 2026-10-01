import type { Course, Subject } from "@prisma/client";
import { parseSchedule, type ScheduleSlot } from "@/lib/schedule";
import { COURSE_COLORS, type CourseColor } from "@/lib/validation/course";

/** Everything the create/edit course form edits, as plain form values. */
export interface CourseFormFields {
  subjectName: string;
  name: string;
  startDate: string;
  endDate: string;
  weightAttendance: number;
  weightAssignment: number;
  weightQuiz: number;
  weightMidterm: number;
  weightFinal: number;
  weightImpression: number;
  maxExcusedAbsences: number;
  passingScore: number;
  institute: string;
  code: string;
  section: string;
  room: string;
  schedule: ScheduleSlot[];
  plannedSessions: number;
  color: CourseColor;
}

export const EMPTY_COURSE_FORM: CourseFormFields = {
  subjectName: "",
  name: "",
  startDate: "",
  endDate: "",
  weightAttendance: 15,
  weightAssignment: 15,
  weightQuiz: 30,
  weightMidterm: 15,
  weightFinal: 15,
  weightImpression: 10,
  maxExcusedAbsences: 3,
  passingScore: 70,
  institute: "",
  code: "",
  section: "",
  room: "",
  schedule: [],
  plannedSessions: 24,
  color: "terracotta",
};

/** Form values for editing an existing course (shared by the dashboard and the Course tab). */
export function courseFormInitial(course: Course & { subject: Subject }): CourseFormFields {
  return {
    subjectName: course.subject.name,
    name: course.name,
    startDate: course.startDate.toISOString().slice(0, 10),
    endDate: course.endDate.toISOString().slice(0, 10),
    weightAttendance: course.weightAttendance,
    weightAssignment: course.weightAssignment,
    weightQuiz: course.weightQuiz,
    weightMidterm: course.weightMidterm,
    weightFinal: course.weightFinal,
    weightImpression: course.weightImpression,
    maxExcusedAbsences: course.maxExcusedAbsences,
    passingScore: course.passingScore,
    institute: course.institute ?? "",
    code: course.code ?? "",
    section: course.section ?? "",
    room: course.room ?? "",
    schedule: parseSchedule(course.schedule),
    plannedSessions: course.plannedSessions,
    color: (COURSE_COLORS as readonly string[]).includes(course.color) ? (course.color as CourseColor) : "terracotta",
  };
}
