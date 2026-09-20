import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanCreateCourse, PlanLimitError } from "@/lib/subscriptions/gate";
import { getOrCreateSubjectId } from "@/lib/getOrCreateSubject";
import { courseInputSchema, validateCourseDateRange } from "@/lib/validation/course";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, role } = session.user;

  const courses = await prisma.course.findMany({
    where:
      role === "TEACHER"
        ? { teacherId: userId }
        : role === "TA"
          ? { assistants: { some: { userId } } }
          : { id: "__none__" }, // students don't see the course dashboard
    include: {
      subject: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Courses are created by their owning teacher; a TA's access comes from
  // being assigned to an existing course, not from creating their own.
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = courseInputSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const data = body.data;

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const dateError = validateCourseDateRange(startDate, endDate);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  try {
    await assertCanCreateCourse(session.user.id);
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }

  const subjectId = await getOrCreateSubjectId(data.subjectName);

  const course = await prisma.course.create({
    data: {
      name: data.name,
      subjectId,
      teacherId: session.user.id,
      startDate,
      endDate,
      maxExcusedAbsences: data.maxExcusedAbsences,
      passingScore: data.passingScore,
      weightAttendance: data.weightAttendance,
      weightAssignment: data.weightAssignment,
      weightQuiz: data.weightQuiz,
      weightMidterm: data.weightMidterm,
      weightFinal: data.weightFinal,
      weightImpression: data.weightImpression,
      institute: data.institute ?? null,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
