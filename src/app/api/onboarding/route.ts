import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { acceptInvite, completeBootstrapOnboarding, InviteError } from "@/lib/invites";
import { PlanLimitError } from "@/lib/subscriptions/gate";

const schema = z.object({
  name: z.string().min(1),
  inviteToken: z.string().optional(),
  institutionName: z.string().min(1).optional(),
});

const INVITE_ERROR_MESSAGES: Record<InviteError["reason"], string> = {
  not_found: "This invite link isn't valid.",
  expired: "This invite has expired.",
  already_accepted: "This invite has already been used.",
  email_mismatch: "This invite was sent to a different email address.",
  already_onboarded: "Your account is already set up.",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { name, inviteToken, institutionName } = body.data;

  try {
    if (inviteToken) {
      await acceptInvite(session.user.id, session.user.email!, inviteToken);
    } else {
      await completeBootstrapOnboarding(session.user.id, name, institutionName ?? null);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof InviteError) {
      return NextResponse.json({ error: INVITE_ERROR_MESSAGES[e.reason] }, { status: 400 });
    }
    if (e instanceof PlanLimitError) {
      return NextResponse.json({ error: e.message }, { status: 402 });
    }
    throw e;
  }
}
