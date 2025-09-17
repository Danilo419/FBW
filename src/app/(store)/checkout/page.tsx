// src/app/(store)/checkout/page.tsx
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckoutPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-6 text-center">Choose Payment Method</h1>

      {/* Client-only logic (router/search params, etc.) must be wrapped in Suspense */}
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">Loading…</div>
        }
      >
        <CheckoutClient />
      </Suspense>
    </main>
  );
}
