// src/app/(store)/checkout/address/page.tsx
import { Suspense } from "react";
import CheckoutAddressClient from "./CheckoutAddressClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AddressPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-6 text-center">Shipping address</h1>

      {/* Client-only part (router/search params) must be wrapped in Suspense */}
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5">Loading address form…</div>
        }
      >
        <CheckoutAddressClient />
      </Suspense>
    </main>
  );
}
