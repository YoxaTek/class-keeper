-- Switch billing provider from Stripe to PayPal: PayPal has no merchant-
-- created "customer" object, so drop stripeCustomerId entirely and rename
-- stripeSubscriptionId to the provider-neutral-in-name-only paypalSubscriptionId.
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId";
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubscriptionId" TO "paypalSubscriptionId";
