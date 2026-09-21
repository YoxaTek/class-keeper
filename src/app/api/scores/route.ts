import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteCourse } from "@/lib/permissions";

const schema = z.object({
  sessionId: z.string(),
  enrollmentId: z.string(),
  category: z.enum(["QUIZ", "ASSIGNMENT", "MIDTERM_READING", "MIDTERM_LISTENING", "FINAL"]),
  // Set for QUIZ/ASSIGNMENT — which of the session's (possibly several)
  // quiz/assignment instances this score belongs to. Null for
  // MIDTERM_READING/MIDTERM_LISTENING/FINAL, which stay one-per-session.
  assessmentId: z.string().nullable().optional(),
  originalScore: z.number().min(0).nullable(),
  retakeScore: z.number().min(0).nullable().optional(),
  retakeMaxScore: z.number().min(0).nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { sessionId, enrollmentId, category, assessmentId, originalScore, retakeScore, retakeMaxScore, note } = body.data;

  const classSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { courseId: true, midtermMaxScore: true, finalMaxScore: true },
  });
  if (!classSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canWriteCourse(session.user.id, classSession.courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let originalMax: number;
  if (assessmentId) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { maxScore: true, sessionId: true },
    });
    if (!assessment || assessment.sessionId !== sessionId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    originalMax = assessment.maxScore;
  } else {
    originalMax =
      {
        MIDTERM_READING: classSession.midtermMaxScore / 2,
        MIDTERM_LISTENING: classSession.midtermMaxScore / 2,
        FINAL: classSession.finalMaxScore,
      }[category as "MIDTERM_READING" | "MIDTERM_LISTENING" | "FINAL"] ?? 100;
  }
  if (originalScore !== null && originalScore > originalMax) {
    return NextResponse.json({ error: `originalScore cannot exceed ${originalMax}` }, { status: 400 });
  }
  if (retakeScore !== null && retakeScore !== undefined && retakeMaxScore != null && retakeScore > retakeMaxScore) {
    return NextResponse.json({ error: `retakeScore cannot exceed retakeMaxScore` }, { status: 400 });
  }

  const data = { originalScore, retakeScore, retakeMaxScore, note };

  const record = assessmentId
    ? await prisma.scoreRecord.upsert({
        where: { assessmentId_enrollmentId: { assessmentId, enrollmentId } },
        create: { sessionId, enrollmentId, category, assessmentId, ...data },
        update: data,
      })
    : await (async () => {
        // MIDTERM_READING/MIDTERM_LISTENING/FINAL have no compound-unique
        // key of their own any more (see ScoreRecord's schema comment), so
        // this is a manual find-then-write instead of a single upsert.
        const existing = await prisma.scoreRecord.findFirst({
          where: { sessionId, enrollmentId, category, assessmentId: null },
        });
        return existing
          ? prisma.scoreRecord.update({ where: { id: existing.id }, data })
          : prisma.scoreRecord.create({ data: { sessionId, enrollmentId, category, ...data } });
      })();

  return NextResponse.json(record);
}
