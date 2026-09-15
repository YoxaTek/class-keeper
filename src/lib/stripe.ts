import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily constructed so the app still builds/runs (core features, tests)
 * before Stripe env vars are configured — it only throws once something
 * actually tries to call Stripe.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(apiKey, { apiVersion: "2026-08-26.dahlia" });
  }
  return _stripe;
}

export const STRIPE_PRICE_IDS = {
  PRO: process.env.STRIPE_PRICE_PRO ?? "",
  INSTITUTION: process.env.STRIPE_PRICE_INSTITUTION ?? "",
} as const;
