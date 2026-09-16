-- AlterTable
ALTER TABLE "ScoreRecord" ADD COLUMN     "retakeMaxScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "quizMaxScore" INTEGER NOT NULL DEFAULT 100;
