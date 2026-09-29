import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { completeBootstrapOnboarding, InviteError } from "@/lib/invites";

const schema = z.object({
  name: z.string().min(1),
  institutionName: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { name, institutionName } = body.data;

  try {
    await completeBootstrapOnboarding(session.user.id, name, institutionName ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // The only reason this ever throws is an already-onboarded account
    // hitting this route directly — everything else (invites, joins) goes
    // through /invites instead.
    if (e instanceof InviteError) return NextResponse.json({ error: "Your account is already set up." }, { status: 400 });
    throw e;
  }
}
