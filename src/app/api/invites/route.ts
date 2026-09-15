import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createInvite } from "@/lib/invites";
import { PlanLimitError } from "@/lib/subscriptions/gate";

const schema = z.object({
  role: z.enum(["TEACHER", "TA", "STUDENT"]),
  email: z.string().email().optional(),
  termId: z.string().optional(),
  studentId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Only a teacher can send invites" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  try {
    const invite = await createInvite({ invitedById: session.user.id, ...body.data });
    return NextResponse.json({ token: invite.token }, { status: 201 });
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message }, { status: 402 });
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
