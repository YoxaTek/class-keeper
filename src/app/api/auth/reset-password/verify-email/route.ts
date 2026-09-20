import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email() });

// Interim, no-email-infra version of "forgot password": confirms an
// account with this email exists (and has a password to reset) before the
// form moves on to actually setting a new one. There's no token or proof
// of email ownership here — anyone who knows the address can reset it —
// so this should be replaced with a real emailed reset link once the app
// has an email provider configured.
export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
