import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getEffectiveSubscription } from "@/lib/subscriptions/effectiveSubscription";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { subscription: true, organization: { include: { subscription: true } } },
  });

  const subscription = getEffectiveSubscription(user);
  if (!subscription) {
    return NextResponse.json({ error: "No subscription to manage yet" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
