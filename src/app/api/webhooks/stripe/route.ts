import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";

function tierFromPriceId(priceId: string | undefined): PlanTier {
  if (priceId === STRIPE_PRICE_IDS.INSTITUTION) return "INSTITUTION";
  return "PRO"; // anything else configured is treated as PRO — extend if more paid tiers are added
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}

/** metadata on the Checkout session / Subscription tells us who this belongs to. */
function scopeFromMetadata(metadata: Stripe.Metadata) {
  if (metadata.organizationId) return { organizationId: metadata.organizationId };
  if (metadata.userId) return { userId: metadata.userId };
  return null;
}

async function upsertSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  scope: { userId: string } | { organizationId: string }
) {
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const currentPeriodEndSeconds = stripeSubscription.items.data[0]?.current_period_end;

  const data = {
    tier: tierFromPriceId(priceId),
    status: mapStripeStatus(stripeSubscription.status),
    stripeCustomerId: stripeSubscription.customer as string,
    stripeSubscriptionId: stripeSubscription.id,
    currentPeriodEnd: currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000) : null,
    ...("userId" in scope ? { userId: scope.userId, organizationId: null } : {}),
    ...("organizationId" in scope ? { organizationId: scope.organizationId, userId: null } : {}),
  };

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (existing) {
    await prisma.subscription.update({ where: { id: existing.id }, data });
  } else {
    await prisma.subscription.upsert({
      where:
        "userId" in scope
          ? { userId: scope.userId }
          : { organizationId: (scope as { organizationId: string }).organizationId },
      create: data,
      update: data,
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const scope = scopeFromMetadata(session.metadata ?? {});
      if (!scope || !session.subscription) break;

      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await upsertSubscriptionFromStripe(stripeSubscription, scope);
      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const scope = scopeFromMetadata(stripeSubscription.metadata ?? {});
      if (!scope) break;
      await upsertSubscriptionFromStripe(stripeSubscription, scope);
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      await prisma.subscription
        .update({
          where: { stripeSubscriptionId: stripeSubscription.id },
          data: { status: "CANCELED" },
        })
        .catch(() => {
          // Subscription row may not exist if checkout.session.completed never landed — nothing to cancel.
        });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await prisma.subscription
        .update({ where: { stripeCustomerId: customerId }, data: { status: "PAST_DUE" } })
        .catch(() => {
          // No subscription row for this customer yet — nothing to mark past-due.
        });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
