-- Enforce one Student row per institution student ID (nulls excluded, so
-- students without one yet are unaffected). This is the natural key the
-- self-serve join route uses to recognize a student a TA already added to
-- a roster, instead of creating a duplicate.
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");
