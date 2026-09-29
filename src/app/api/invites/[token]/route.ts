import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAcceptableInviteContext } from "@/lib/invites";

// Read-only preview for the QR scanner's in-place accept dialog — shows
// who invited you and what for before you commit, without mutating
// anything (unlike tryAcceptAdditionalTaCourse). Accepting is still a
// separate POST to /api/invites/accept.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const result = await getAcceptableInviteContext(token, session.user.id, session.user.email!);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ invite: result.invite });
}
