import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paypalFetch, PAYPAL_PLAN_IDS } from "@/lib/paypal";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";

interface PayPalSubscriptionResource {
  id: string;
  plan_id?: string;
  status: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string };
}

interface PayPalWebhookEvent {
  event_type: string;
  resource: PayPalSubscriptionResource;
}

function tierFromPlanId(planId: string | undefined): PlanTier {
  if (planId === PAYPAL_PLAN_IDS.INSTITUTION) return "INSTITUTION";
  return "PRO"; // anything else configured is treated as PRO — extend if more paid tiers are added
}

function mapPayPalStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "SUSPENDED":
      return "PAST_DUE";
    case "CANCELLED":
    case "EXPIRED":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}

/** custom_id on the subscription tells us who this belongs to — see checkout/route.ts. */
function scopeFromCustomId(customId: string | undefined): { userId: string } | { organizationId: string } | null {
  if (!customId) return null;
  try {
    const parsed: { userId?: string; organizationId?: string } = JSON.parse(customId);
    if (parsed.organizationId) return { organizationId: parsed.organizationId };
    if (parsed.userId) return { userId: parsed.userId };
  } catch {
    // malformed custom_id — nothing to attribute this to
  }
  return null;
}

async function upsertSubscriptionFromPayPal(resource: PayPalSubscriptionResource) {
  const scope = scopeFromCustomId(resource.custom_id);
  if (!scope) return;

  const data = {
    tier: tierFromPlanId(resource.plan_id),
    status: mapPayPalStatus(resource.status),
    paypalSubscriptionId: resource.id,
    currentPeriodEnd: resource.billing_info?.next_billing_time
      ? new Date(resource.billing_info.next_billing_time)
      : null,
    ...("userId" in scope ? { userId: scope.userId, organizationId: null } : {}),
    ...("organizationId" in scope ? { organizationId: scope.organizationId, userId: null } : {}),
  };

  await prisma.subscription.upsert({
    where: "userId" in scope ? { userId: scope.userId } : { organizationId: scope.organizationId },
    create: data,
    update: data,
  });
}

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const rawBody = await request.text();
  const webhookEvent = JSON.parse(rawBody) as PayPalWebhookEvent;

  const verifyRes = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      cert_url: request.headers.get("paypal-cert-url"),
      auth_algo: request.headers.get("paypal-auth-algo"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });
  const verification = (await verifyRes.json()) as { verification_status: string };
  if (verification.verification_status !== "SUCCESS") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (webhookEvent.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.UPDATED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      // resource.status already reflects the new state for all four —
      // mapPayPalStatus() turns SUSPENDED into PAST_DUE, everything else
      // (ACTIVE included) into ACTIVE.
      await upsertSubscriptionFromPayPal(webhookEvent.resource);
      break;

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await prisma.subscription
        .update({
          where: { paypalSubscriptionId: webhookEvent.resource.id },
          data: { status: "CANCELED" },
        })
        .catch(() => {
          // Subscription row may not exist if ACTIVATED never landed — nothing to cancel.
        });
      break;

    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await prisma.subscription
        .update({
          where: { paypalSubscriptionId: webhookEvent.resource.id },
          data: { status: "PAST_DUE" },
        })
        .catch(() => {
          // No subscription row for this id yet — nothing to mark past-due.
        });
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
