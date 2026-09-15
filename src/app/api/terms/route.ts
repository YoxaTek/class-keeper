import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanCreateTerm, PlanLimitError } from "@/lib/subscriptions/gate";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, role } = session.user;

  const terms = await prisma.term.findMany({
    where:
      role === "TEACHER"
        ? { teacherId: userId }
        : role === "TA"
          ? { assistants: { some: { userId } } }
          : { id: "__none__" }, // students don't see the term dashboard
    include: {
      subject: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(terms);
}

const createTermSchema = z.object({
  name: z.string().min(1),
  subjectId: z.string().optional(),
  newSubjectName: z.string().min(1).optional(),
  startDate: z.string(),
  endDate: z.string(),
  maxExcusedAbsences: z.number().int().min(0).default(3),
  midtermMaxScore: z.number().int().min(1).default(100),
  passingScore: z.number().min(0).max(100).default(70),
  weightAttendance: z.number().min(0).default(15),
  weightAssignment: z.number().min(0).default(15),
  weightQuiz: z.number().min(0).default(30),
  weightMidterm: z.number().min(0).default(15),
  weightFinal: z.number().min(0).default(15),
  weightImpression: z.number().min(0).default(10),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Terms are created by their owning teacher; a TA's access comes from
  // being assigned to an existing term, not from creating their own.
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = createTermSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const data = body.data;

  if (!data.subjectId && !data.newSubjectName) {
    return NextResponse.json({ error: "subjectId or newSubjectName is required" }, { status: 400 });
  }

  try {
    await assertCanCreateTerm(session.user.id);
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }

  const subjectId = data.subjectId
    ? data.subjectId
    : (await prisma.subject.create({ data: { name: data.newSubjectName! } })).id;

  const term = await prisma.term.create({
    data: {
      name: data.name,
      subjectId,
      teacherId: session.user.id,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      maxExcusedAbsences: data.maxExcusedAbsences,
      midtermMaxScore: data.midtermMaxScore,
      passingScore: data.passingScore,
      weightAttendance: data.weightAttendance,
      weightAssignment: data.weightAssignment,
      weightQuiz: data.weightQuiz,
      weightMidterm: data.weightMidterm,
      weightFinal: data.weightFinal,
      weightImpression: data.weightImpression,
    },
  });

  return NextResponse.json(term, { status: 201 });
}
