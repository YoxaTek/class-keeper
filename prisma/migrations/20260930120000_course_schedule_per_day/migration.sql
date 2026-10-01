-- Meeting times can differ per weekday: replace the single startTime/endTime
-- with a per-day schedule, backfilled from the old columns.

ALTER TABLE "Course" ADD COLUMN "schedule" JSONB NOT NULL DEFAULT '[]';

UPDATE "Course"
SET "schedule" = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'startTime', "startTime", 'endTime', "endTime") ORDER BY d), '[]'::jsonb)
  FROM unnest("weekdays") AS d
)
WHERE cardinality("weekdays") > 0;

ALTER TABLE "Course" DROP COLUMN "startTime", DROP COLUMN "endTime";
