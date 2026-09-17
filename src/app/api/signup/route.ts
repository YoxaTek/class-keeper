import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { name, email, password } = body.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  // role/locale/onboardingComplete/organizationId mirror the schema's own
  // defaults, same as the Google/Facebook/LINE profile() callbacks in
  // auth.ts — every self-serve signup with no invite is a teacher.
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "TEACHER",
      locale: null,
      onboardingComplete: false,
      organizationId: null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
