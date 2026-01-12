// src/components/admin/CustomerCopyCard.tsx
"use client";

import React from "react";
import { ClipboardCopy, CheckCircle2 } from "lucide-react";

type Shipping = {
  fullName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

function clean(v?: string | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function buildCustomerText(s: Shipping) {
  const name = clean(s.fullName) ?? "—";
  const addressLine1 = clean(s.address1);
  const addressLine2 = clean(s.address2);
  const address = [addressLine1, addressLine2].filter(Boolean).join(", ");

  const city = clean(s.city) ?? "—";
  const state = clean(s.region) ?? "—";
  const country = clean(s.country) ?? "—";
  const zip = clean(s.postalCode) ?? "—";
  const telephone = clean(s.phone) ?? "—";

  // ✅ formato exatamente como na tua print
  return [
    `Name: ${name}`,
    `Address: ${address || "—"}`,
    `City: ${city}`,
    `State: ${state}`,
    `Country: ${country}`,
    `Zip code: ${zip}`,
    `Telephone: ${telephone}`,
  ].join("\n");
}

export default function CustomerCopyCard({ shipping }: { shipping: Shipping }) {
  const [copied, setCopied] = React.useState(false);
  const text = React.useMemo(() => buildCustomerText(shipping), [shipping]);

  const copy = async () => {
    try {
      await (navigator as any).clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // se falhar, não faz nada (mas normalmente funciona)
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Customer (Copy)</div>

        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          title="Copy customer text"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-4 w-4" />
              Copy customer text
            </>
          )}
        </button>
      </div>

      <div className="mt-3 rounded-2xl border bg-emerald-50 p-3">
        <pre className="whitespace-pre-wrap break-words text-sm font-medium text-emerald-950">
{text}
        </pre>
      </div>
    </div>
  );
}
