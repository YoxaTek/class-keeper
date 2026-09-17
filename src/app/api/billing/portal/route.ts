import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSubscription } from "@/lib/subscriptions/effectiveSubscription";

// ponytail: PayPal has no per-subscription hosted portal like Stripe's — the
// closest equivalent is the payer's own generic "Automatic Payments" page,
// which lists every merchant they've ever subscribed to, not just this one.
// Upgrade path: build a scoped cancel/manage UI here calling PayPal's
// subscription cancel/suspend API directly if that matters later.
const PAYPAL_AUTOPAY_URL = "https://www.paypal.com/myaccount/autopay/";

export async function POST() {
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

  return NextResponse.json({ url: PAYPAL_AUTOPAY_URL });
}
