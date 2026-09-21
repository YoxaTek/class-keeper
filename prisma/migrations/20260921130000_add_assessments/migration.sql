-- Replace Session's single hasQuiz/quizMaxScore and hasAssignment/
-- assignmentMaxScore fields with a repeatable Assessment child row per
-- quiz/assignment instance, so a session can have any number of each
-- (e.g. 2 quizzes in the same class) instead of exactly zero or one.

-- 1. New enum + table.
CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'ASSIGNMENT');

CREATE TABLE "Assessment" (
    "id"        TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type"      "AssessmentType" NOT NULL,
    "label"     TEXT,
    "maxScore"  INTEGER NOT NULL DEFAULT 100,
    "order"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill: one Assessment per session that currently has a quiz and/or
-- an assignment, carrying over that session's existing single total.
INSERT INTO "Assessment" ("id", "sessionId", "type", "maxScore", "order")
SELECT gen_random_uuid()::text, "id", 'QUIZ', "quizMaxScore", 0
FROM "Session" WHERE "hasQuiz" = true;

INSERT INTO "Assessment" ("id", "sessionId", "type", "maxScore", "order")
SELECT gen_random_uuid()::text, "id", 'ASSIGNMENT', "assignmentMaxScore", 0
FROM "Session" WHERE "hasAssignment" = true;

-- 3. Point existing QUIZ/ASSIGNMENT ScoreRecords at their new Assessment.
ALTER TABLE "ScoreRecord" ADD COLUMN "assessmentId" TEXT;

UPDATE "ScoreRecord" sr
SET "assessmentId" = a."id"
FROM "Assessment" a
WHERE a."sessionId" = sr."sessionId" AND a."type" = 'QUIZ' AND sr."category" = 'QUIZ';

UPDATE "ScoreRecord" sr
SET "assessmentId" = a."id"
FROM "Assessment" a
WHERE a."sessionId" = sr."sessionId" AND a."type" = 'ASSIGNMENT' AND sr."category" = 'ASSIGNMENT';

ALTER TABLE "ScoreRecord" ADD CONSTRAINT "ScoreRecord_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Replace the old (sessionId, enrollmentId, category) uniqueness — it
-- blocked more than one QUIZ/ASSIGNMENT record per session, which is
-- exactly what multiple quizzes/assignments needs to allow. A partial index
-- keeps the same guarantee for MIDTERM_READING/MIDTERM_LISTENING/FINAL
-- (assessmentId always null there, backfilled above only for QUIZ/
-- ASSIGNMENT); assessment-scoped scores are deduped by the new
-- (assessmentId, enrollmentId) constraint instead.
DROP INDEX "ScoreRecord_sessionId_enrollmentId_category_key";

CREATE UNIQUE INDEX "ScoreRecord_session_category_no_assessment_key"
  ON "ScoreRecord"("sessionId", "enrollmentId", "category") WHERE "assessmentId" IS NULL;

CREATE UNIQUE INDEX "ScoreRecord_assessmentId_enrollmentId_key"
  ON "ScoreRecord"("assessmentId", "enrollmentId");

-- 5. Drop the now-superseded single quiz/assignment fields on Session.
ALTER TABLE "Session" DROP COLUMN "hasQuiz";
ALTER TABLE "Session" DROP COLUMN "quizMaxScore";
ALTER TABLE "Session" DROP COLUMN "hasAssignment";
ALTER TABLE "Session" DROP COLUMN "assignmentMaxScore";
