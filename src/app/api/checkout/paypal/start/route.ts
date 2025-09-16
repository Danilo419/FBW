import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ---- Environment & endpoints ----
const ENV = (process.env.PAYPAL_ENV ?? 'live').trim().toLowerCase();
const BASE =
  ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = (process.env.PAYPAL_CLIENT_ID ?? '').trim();
const CLIENT_SECRET = (process.env.PAYPAL_SECRET ?? '').trim();

// Fail fast with useful messages (prevents vague "invalid_client")
function assertCredentials() {
  if (!CLIENT_ID) {
    throw new Error(
      'PAYPAL_CLIENT_ID is empty. Make sure you copied the **LIVE** Client ID from Dashboard › My apps & credentials (Live).'
    );
  }
  if (!CLIENT_SECRET) {
    throw new Error(
      'PAYPAL_SECRET is empty. Click **Generate new secret** on your LIVE app and paste it here (no quotes, no spaces).'
    );
  }
}

async function getAccessToken() {
  assertCredentials();
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

  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* keep raw */ }

  if (!res.ok) {
    // Preserve PayPal’s reason for easier debugging
    const reason =
      (data?.error && data?.error_description)
        ? `${data.error}: ${data.error_description}`
        : raw || `Status ${res.status}`;
    throw new Error(`PayPal OAuth failed (${ENV}): ${reason}`);
  }
  return data.access_token as string;
}

async function createOrder(accessToken: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        // TODO: replace with your real cart totals
        { amount: { currency_code: 'EUR', value: '40.00' } },
      ],
      application_context: {
        brand_name: 'FootBallWorld',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${baseUrl}/api/checkout/paypal/return`,
        cancel_url: `${baseUrl}/cart?paypal=cancelled`,
      },
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.details?.[0]?.description ||
      data?.message ||
      `Create order failed (status ${res.status})`;
    throw new Error(msg);
  }

  const approveUrl =
    (data?.links || []).find((l: any) => l.rel === 'approve')?.href ??
    (data?.links || []).find((l: any) => l.rel === 'payer-action')?.href;

  if (!approveUrl) throw new Error('Missing approval URL from PayPal.');
  return { id: data.id as string, approveUrl: approveUrl as string };
}

export async function POST() {
  try {
    const token = await getAccessToken();
    const { id, approveUrl } = await createOrder(token);
    return NextResponse.json({ orderId: id, approveUrl });
  } catch (e: any) {
    // Useful but safe server log (no secrets)
    console.error('[PayPal start]', e?.message, {
      env: ENV,
      idLen: CLIENT_ID.length,
      secretLen: CLIENT_SECRET.length,
    });
    return NextResponse.json({ error: e?.message || 'PayPal error' }, { status: 400 });
  }
}
