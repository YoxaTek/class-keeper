-- Remove the 30-enrollments-per-course cap entirely: drop the trigger and
-- its backing function added in 20260915130600_enrollment_cap_trigger
-- (renamed to reference "Course" in 20260920000000_rename_term_to_course).

DROP TRIGGER IF EXISTS enrollment_cap_trigger ON "Enrollment";
DROP FUNCTION IF EXISTS enforce_enrollment_cap();
