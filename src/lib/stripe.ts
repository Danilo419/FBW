// src/lib/stripe.ts
import Stripe from 'stripe';

const raw = (process.env.STRIPE_SECRET_KEY || '').trim(); // remove espaços/CRLF
if (!raw) {
  throw new Error('STRIPE_SECRET_KEY is missing. Check your .env');
}
if (!/^sk_(test|live)_/.test(raw)) {
  throw new Error('STRIPE_SECRET_KEY has an unexpected format.');
}

export const stripe = new Stripe(raw, {
  apiVersion: '2024-06-20' as any,
});
