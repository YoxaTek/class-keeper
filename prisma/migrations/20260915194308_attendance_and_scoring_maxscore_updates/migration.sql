-- Remove the ABROAD attendance status (no existing rows use it)
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'EXCUSED', 'ABSENT', 'NOT_ENROLLED');
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus" USING ("status"::text::"AttendanceStatus");
DROP TYPE "AttendanceStatus_old";

-- Per-class max scores for assignment, midterm, and final (quiz already has one)
ALTER TABLE "Session" ADD COLUMN "assignmentMaxScore" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Session" ADD COLUMN "midtermMaxScore" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Session" ADD COLUMN "finalMaxScore" INTEGER NOT NULL DEFAULT 100;

-- Midterm's max score moves from term-wide to per-class
ALTER TABLE "Term" DROP COLUMN "midtermMaxScore";
