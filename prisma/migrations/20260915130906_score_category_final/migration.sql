-- AlterEnum
ALTER TYPE "ScoreCategory" ADD VALUE 'FINAL';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "hasFinal" BOOLEAN NOT NULL DEFAULT false;
