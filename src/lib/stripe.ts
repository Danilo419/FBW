// src/lib/stripe.ts
import Stripe from "stripe";

declare global {
  // eslint-disable-next-line no-var
  var _stripe: Stripe | undefined;
}

export function getStripe(): Stripe {
  if (!global._stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is missing. Set it in Vercel → Project → Settings → Environment Variables."
      );
    }
    global._stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia", // ✅ compatível com o SDK atual
    });
  }
  return global._stripe!;
}
