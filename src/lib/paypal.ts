// src/lib/paypal.ts
import paypal from "@paypal/checkout-server-sdk";
export { paypal };

// NÃO faças .startsWith/.trim() em envs aqui.
// Só lê as envs e constrói o client.
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();

const environment =
  ENV === "live"
    ? new paypal.core.LiveEnvironment(CLIENT_ID, CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(CLIENT_ID, CLIENT_SECRET);

export const paypalClient = new paypal.core.PayPalHttpClient(environment);
