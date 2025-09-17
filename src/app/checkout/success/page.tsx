// src/app/checkout/success/page.tsx
import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckoutSuccessPage() {
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-4 text-center">Thank you!</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading your order…
          </div>
        }
      >
        <SuccessClient />
      </Suspense>
    </main>
  );
}
