import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paypalFetch, PAYPAL_PLAN_IDS } from "@/lib/paypal";

const schema = z.object({ tier: z.enum(["PRO", "INSTITUTION"]) });

interface PayPalLink {
  rel: string;
  href: string;
}

/**
 * Creates a PayPal subscription for the caller's own plan (PRO) or their
 * organization's plan (INSTITUTION — an org is created on the fly if the
 * teacher doesn't belong to one yet) and returns the "approve" link the
 * browser redirects to. The Subscription row itself is only ever written by
 * the webhook once the payer actually approves it — not here.
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

  const planId = PAYPAL_PLAN_IDS[tier];
  if (!planId) {
    return NextResponse.json({ error: `No PayPal plan configured for ${tier}` }, { status: 500 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  let scope: { userId: string } | { organizationId: string };
  if (tier === "INSTITUTION") {
    let organizationId = user.organizationId;
    if (!organizationId) {
      const org = await prisma.organization.create({ data: { name: `${user.name ?? user.email}'s Organization` } });
      await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
      organizationId = org.id;
    }
    scope = { organizationId };
  } else {
    scope = { userId: user.id };
  }

  const origin = new URL(request.url).origin;

  const res = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      // Under PayPal's 127-char limit — the scope is either {userId} or
      // {organizationId}, both short cuids. Read back by the webhook.
      custom_id: JSON.stringify({ tier, ...scope }),
      application_context: {
        brand_name: "ClassKeeper",
        return_url: `${origin}/billing?checkout=success`,
        cancel_url: `${origin}/billing?checkout=canceled`,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });
  const subscription = (await res.json()) as { links?: PayPalLink[] };
  const approveLink = subscription.links?.find((l) => l.rel === "approve")?.href;
  if (!approveLink) {
    return NextResponse.json({ error: "PayPal did not return an approval link" }, { status: 502 });
  }

  return NextResponse.json({ url: approveLink });
}
