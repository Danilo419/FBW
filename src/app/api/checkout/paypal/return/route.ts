import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ENV = (process.env.PAYPAL_ENV ?? 'live').trim().toLowerCase();
const BASE =
  ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = (process.env.PAYPAL_CLIENT_ID ?? '').trim();
const CLIENT_SECRET = (process.env.PAYPAL_SECRET ?? '').trim();

async function getAccessToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`, 'utf8').toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error_description || data?.error || `OAuth ${res.status}`
    );
  }
  return data.access_token as string;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = await getAccessToken();
    const orderId = url.searchParams.get('token'); // PayPal sends ?token=<orderId>

    if (!orderId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/cart?paypal=missing_token`);
    }

    const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data?.details?.[0]?.description ||
        data?.message ||
        `Capture failed (status ${res.status})`;
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/cart?paypal_error=${encodeURIComponent(msg)}`
      );
    }

    // TODO: persist order/payment in your DB here

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?paypal_order=${orderId}`
    );
  } catch (e: any) {
    console.error('[PayPal return]', e?.message);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/cart?paypal_error=${encodeURIComponent(e?.message || 'PayPal error')}`
    );
  }
}
