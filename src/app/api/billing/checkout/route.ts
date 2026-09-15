import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

const schema = z.object({ tier: z.enum(["PRO", "INSTITUTION"]) });

/**
 * Starts a Stripe Checkout session for the caller's own plan (PRO) or their
 * organization's plan (INSTITUTION — an org is created on the fly if the
 * teacher doesn't belong to one yet). The resulting Subscription row is
 * created by the webhook once checkout.session.completed fires, never here —
 * we only ever get the customer/subscription IDs back from Stripe async.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { tier } = body.data;

  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for ${tier}` }, { status: 500 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { subscription: true, organization: { include: { subscription: true } } },
  });

  const origin = new URL(request.url).origin;

  let scope: { userId: string } | { organizationId: string };
  let existingCustomerId: string | null;

  if (tier === "INSTITUTION") {
    let organizationId = user.organizationId;
    if (!organizationId) {
      const org = await prisma.organization.create({ data: { name: `${user.name ?? user.email}'s Organization` } });
      await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
      organizationId = org.id;
    }
    scope = { organizationId };
    existingCustomerId = user.organization?.subscription?.stripeCustomerId ?? null;
  } else {
    scope = { userId: user.id };
    existingCustomerId = user.subscription?.stripeCustomerId ?? null;
  }

  const stripe = getStripe();
  const customerId =
    existingCustomerId ??
    (
      await stripe.customers.create({
        email: user.email,
        metadata: scope,
      })
    ).id;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=canceled`,
    metadata: { tier, ...scope },
    subscription_data: { metadata: { tier, ...scope } },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
