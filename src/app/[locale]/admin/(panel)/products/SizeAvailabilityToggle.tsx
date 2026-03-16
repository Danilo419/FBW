// src/app/admin/(panel)/products/SizeAvailabilityToggle.tsx
"use client";

import * as React from "react";
import { setSizeUnavailable } from "@/app/admin/(panel)/products/actions";

type Props = {
  sizeId: string;
  /** If the size starts as unavailable, pass true */
  initialUnavailable?: boolean;
};

export default function SizeAvailabilityToggle({
  sizeId,
  initialUnavailable = false,
}: Props) {
  // optimistic state
  const [unavailable, setUnavailable] = React.useState<boolean>(initialUnavailable);
  const [isPending, startTransition] = React.useTransition();

  async function persist(nextUnavailable: boolean) {
    await setSizeUnavailable({ sizeId, unavailable: nextUnavailable });
  }

  function onToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked; // checked === Unavailable

    // optimistic update
    setUnavailable(next);

    startTransition(async () => {
      try {
        await persist(next);
      } catch (err) {
        // rollback on failure
        console.error(err);
        setUnavailable(!next);
        alert("Failed to update size availability.");
      }
    });
  }

  return (
    <label
      className="inline-flex items-center gap-2 text-xs cursor-pointer select-none"
      title={unavailable ? "Mark as available" : "Mark as unavailable"}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-0"
        checked={unavailable}
        onChange={onToggle}
        disabled={isPending}
        aria-checked={unavailable}
        aria-label={unavailable ? "Unavailable" : "Available"}
      />
      <span
        className={
          "rounded-md px-2 py-0.5 " +
          (unavailable
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-green-100 text-green-700 border border-green-200")
        }
      >
        {unavailable ? "Unavailable" : "Available"}
      </span>
    </label>
  );
}
