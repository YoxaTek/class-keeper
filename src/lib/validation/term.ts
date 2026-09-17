import { z } from "zod";

export const termInputSchema = z
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
  })
  // The grading weights are percentage points fed directly into the total
  // grade (see calculateGrade.ts) — they have to sum to 100 or every term's
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

export type TermInput = z.infer<typeof termInputSchema>;

/** Shared by the create/edit API routes: parses dates and checks the range. Returns an error string, or null if valid. */
export function validateTermDateRange(startDate: Date, endDate: Date): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Invalid startDate or endDate";
  }
  if (endDate < startDate) {
    return "End date must be on or after start date";
  }
  return null;
}
