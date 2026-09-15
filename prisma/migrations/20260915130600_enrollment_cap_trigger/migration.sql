-- Enforce max 30 enrollments per term at the database level.
-- Prisma's schema DSL has no way to express a per-group row-count
-- constraint, so this is done with a trigger.

CREATE OR REPLACE FUNCTION enforce_enrollment_cap() RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Lock the parent Term row first so concurrent inserts for the same
  -- term serialize instead of both reading the count before either commits.
  PERFORM 1 FROM "Term" WHERE id = NEW."termId" FOR UPDATE;
  SELECT COUNT(*) INTO current_count FROM "Enrollment" WHERE "termId" = NEW."termId";
  IF current_count >= 30 THEN
    RAISE EXCEPTION 'Term % already has 30 enrollments (max reached)', NEW."termId"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enrollment_cap_trigger ON "Enrollment";
CREATE TRIGGER enrollment_cap_trigger
  BEFORE INSERT ON "Enrollment"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_enrollment_cap();
