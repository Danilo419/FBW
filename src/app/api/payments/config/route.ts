import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const env = (process.env.PAYPAL_ENV || 'live').trim().toLowerCase();
  const paypalEnabled = Boolean((process.env.PAYPAL_CLIENT_ID || '').trim() && (process.env.PAYPAL_SECRET || '').trim());
  const stripeEnabled = Boolean((process.env.STRIPE_SECRET_KEY || '').trim()); // opcional

  // Nunca devolve secrets, só flags
  return NextResponse.json({
    env,
    paypalEnabled,
    stripeEnabled,
  });
}
