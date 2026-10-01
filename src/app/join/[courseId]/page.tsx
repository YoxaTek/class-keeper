import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvitesLoginRedirect } from "@/lib/parseInviteLink";

// A class join link has no page of its own: /invites owns the join form and
// its rules. Signed in → straight there; signed out → straight to the login
// screen (which links to sign-up) with a callback back to it, so opening the
// link never costs an extra click.
export default async function JoinCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) notFound();

  const session = await auth();
  if (session) redirect(`/invites?course=${encodeURIComponent(courseId)}`);

  redirect(buildInvitesLoginRedirect("course", courseId));
}
