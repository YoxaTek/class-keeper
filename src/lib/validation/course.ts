import { z } from "zod";
import { scheduleSchema } from "@/lib/schedule";

export const COURSE_COLORS = ["terracotta", "teal", "clay", "rust"] as const;
export type CourseColor = (typeof COURSE_COLORS)[number];

export const courseInputSchema = z
  .object({
    name: z.string().min(1),
    subjectName: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    maxExcusedAbsences: z.number().int().min(0).default(3),
    passingScore: z.number().min(0).max(100).default(70),
    weightAttendance: z.number().min(0).default(15),
    weightAssignment: z.number().min(0).default(15),
    weightQuiz: z.number().min(0).default(30),
    weightMidterm: z.number().min(0).default(15),
    weightFinal: z.number().min(0).default(15),
    weightImpression: z.number().min(0).default(10),
    institute: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    section: z.string().nullable().optional(),
    room: z.string().nullable().optional(),
    schedule: scheduleSchema.default([]),
    plannedSessions: z.number().int().min(0).max(200).default(0),
    color: z.enum(COURSE_COLORS).default("terracotta"),
  })
  // The grading weights are percentage points fed directly into the total
  // grade (see calculateGrade.ts) — they have to sum to 100 or every course's
  // total/passing calculation goes out of scale.
  .refine(
    (data) =>
      data.weightAttendance +
        data.weightAssignment +
        data.weightQuiz +
        data.weightMidterm +
        data.weightFinal +
        data.weightImpression ===
      100,
    { message: "Grading weights must add up to 100", path: ["weightAttendance"] }
  );

export type CourseInput = z.infer<typeof courseInputSchema>;

/** Shared by the create/edit API routes: parses dates and checks the range. Returns an error string, or null if valid. */
export function validateCourseDateRange(startDate: Date, endDate: Date): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Invalid startDate or endDate";
  }
  if (endDate < startDate) {
    return "End date must be on or after start date";
  }
  return null;
}
