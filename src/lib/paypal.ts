// src/lib/paypal.ts
import paypal from '@paypal/checkout-server-sdk';

function environment() {
  const cid = process.env.PAYPAL_CLIENT_ID!;
  const sec = process.env.PAYPAL_CLIENT_SECRET!;
  // Use Sandbox unless you explicitly put Live credentials
  return cid.startsWith('A') || cid.startsWith('B')
    ? new paypal.core.LiveEnvironment(cid, sec)
    : new paypal.core.SandboxEnvironment(cid, sec);
}

export const paypalClient = new paypal.core.PayPalHttpClient(environment());
export { paypal };
