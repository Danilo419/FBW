// src/app/(store)/checkout/link/page.tsx
import { Suspense } from "react";
import LinkClient from "./LinkClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckoutLinkPage() {
  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-4 text-center">Finalizing payment…</h1>

      {/* Any client hook usage must be inside Suspense */}
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Checking payment status…
          </div>
        }
      >
        <LinkClient />
      </Suspense>
    </main>
  );
}
