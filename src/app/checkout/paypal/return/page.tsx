// src/app/checkout/paypal/return/page.tsx
import { Suspense } from "react";
import ReturnClient from "./ReturnClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PayPalReturnPage() {
  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-4 text-center">Finalizing PayPal payment…</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Checking payment status…
          </div>
        }
      >
        <ReturnClient />
      </Suspense>
    </main>
  );
}
