-- Course schedule + presentation fields. All additive: nullable, or with a
-- default, so existing rows keep working untouched.

ALTER TABLE "Course"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "section" TEXT,
  ADD COLUMN "room" TEXT,
  ADD COLUMN "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "startTime" TEXT,
  ADD COLUMN "endTime" TEXT,
  ADD COLUMN "plannedSessions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "color" TEXT NOT NULL DEFAULT 'terracotta';
