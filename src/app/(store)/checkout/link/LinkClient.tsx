// src/app/(store)/checkout/link/LinkClient.tsx
'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Status = "idle" | "processing" | "success" | "error";

export default function LinkClient() {
  const params = useSearchParams();
  const router = useRouter();

  const query = useMemo(() => {
    // Convert URLSearchParams -> plain object for display / API calls
    const obj: Record<string, string> = {};
    params.forEach((v, k) => (obj[k] = v));
    return obj;
  }, [params]);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let alive = true;

    // Try to notify your backend about the Link redirect params.
    // If you don't have this endpoint yet, this will safely no-op.
    (async () => {
      setStatus("processing");
      try {
        const r = await fetch("/api/checkout/link/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await r.json().catch(() => ({}));
        if (!alive) return;

        if (r.ok) {
          setStatus("success");
          setMessage(data?.message || "Payment confirmed.");
          // Optional: redirect to order confirmation page if backend returns one
          if (data?.redirectUrl) router.replace(String(data.redirectUrl));
        } else {
          setStatus("error");
          setMessage(data?.error || "Could not confirm payment.");
        }
      } catch {
        if (!alive) return;
        setStatus("error");
        setMessage("Network error while confirming payment.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [query, router]);

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      {status === "processing" && (
        <p className="text-sm text-gray-700">Confirming your payment…</p>
      )}

      {status === "success" && (
        <div className="space-y-2">
          <p className="text-green-700 text-sm rounded-md border border-green-200 bg-green-50 px-3 py-2">
            {message || "Payment successful."}
          </p>
          <button
            onClick={() => router.replace("/checkout?step=review")}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Continue
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-red-700 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
            {message || "Payment failed."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.replace("/checkout")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Try another method
            </button>
            <button
              onClick={() => router.replace("/")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        </div>
      )}

      {/* Debug info (optional): shows returned query params */}
      <details className="text-xs text-gray-500">
        <summary>Show redirect parameters</summary>
        <pre className="mt-2 overflow-x-auto">
{JSON.stringify(query, null, 2)}
        </pre>
      </details>
    </div>
  );
}
