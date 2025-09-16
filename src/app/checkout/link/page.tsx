// src/app/checkout/link/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

/** Public key must be exposed as NEXT_PUBLIC_... */
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = pk ? loadStripe(pk) : null;

export default function LinkCheckoutPage() {
  const search = useSearchParams();
  const orderId = search.get("order") || "";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // fetch a PaymentIntent client_secret for this order
  useEffect(() => {
    let active = true;
    async function go() {
      setError(null);
      setClientSecret(null);
      if (!orderId) {
        setError("Missing order id.");
        return;
      }
      if (!pk) {
        setError("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
        return;
      }
      try {
        const res = await fetch("/api/checkout/link/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to start Link checkout (HTTP ${res.status})`);
        }
        const j = (await res.json()) as { clientSecret?: string };
        if (active) setClientSecret(j.clientSecret || null);
        if (active && !j.clientSecret) setError("Server did not return clientSecret.");
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to start Link checkout.");
      }
    }
    go();
    return () => {
      active = false;
    };
  }, [orderId]);

  const appearance = useMemo(
    () => ({
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#000000",
        borderRadius: "10px",
      },
    }),
    []
  );

  // Elements options: only render after we have the clientSecret
  const options = useMemo(
    () =>
      clientSecret
        ? ({
            clientSecret,
            appearance,
            loader: "auto",
          } as const)
        : undefined,
    [clientSecret, appearance]
  );

  return (
    <div className="container-fw section-gap">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Pay with Link</h1>
        <p className="mt-2 text-gray-600">
          Use your saved details with Stripe Link for a fast, secure checkout.
        </p>
      </header>

      {!pk && (
        <div className="card p-4 border-amber-300 bg-amber-50 text-amber-800">
          <b>Missing publishable key:</b> set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in your
          environment.
        </div>
      )}

      {error && (
        <div className="card p-4 mt-4 border-rose-300 bg-rose-50 text-rose-700">
          <b>Checkout error:</b> {error}
        </div>
      )}

      {!error && !clientSecret && (
        <div className="card p-6 mt-4">
          <div className="animate-pulse text-gray-500">Preparing Link checkout…</div>
        </div>
      )}

      {stripePromise && options && (
        <Elements stripe={stripePromise} options={options}>
          <div className="card p-6 mt-4">
            <CheckoutForm orderId={orderId} />
          </div>
        </Elements>
      )}
    </div>
  );
}

/* --------------------------- form --------------------------- */

function CheckoutForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      // Confirm the payment with Link in the PaymentElement
      const { error } = await stripe.confirmPayment({
        elements,
        // If Link requires a redirect (e.g., 3DS), Stripe will handle it
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order=${encodeURIComponent(
            orderId
          )}&provider=stripe`,
        },
      });

      if (error) {
        setMsg(error.message || "Payment failed. Try again.");
        setSubmitting(false);
        return;
      }

      // If no redirect was needed, navigate to success right away
      router.push(`/checkout/success?order=${encodeURIComponent(orderId)}&provider=stripe`);
    } catch (err: any) {
      setMsg(err?.message || "Unexpected error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-sm text-gray-600">
        <p>Sign in with Link or enter your email to get started:</p>
      </div>

      {/* Captura email / login Link */}
      <LinkAuthenticationElement
        options={{ defaultValues: { email: "" } }}
      />

      {/* Mostra o PaymentElement — Link aparecerá prioritário se o PaymentIntent foi criado para Link */}
      <PaymentElement />

      {msg && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="btn-primary w-full disabled:opacity-60"
      >
        {submitting ? "Processing…" : "Pay with Link"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Secured by Stripe. You may be redirected to complete authentication.
      </p>
    </form>
  );
}
