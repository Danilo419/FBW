"use client";

import * as React from "react";
import { setSizeUnavailable } from "@/app/admin/(panel)/products/actions";

export default function SizeAvailabilityToggle(props: {
  sizeId: string;
  initialUnavailable: boolean;
}) {
  const { sizeId, initialUnavailable } = props;
  const [unavailable, setUnavailable] = React.useState(initialUnavailable);
  const [pending, startTransition] = React.useTransition();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked; // checked === Unavailable
    setUnavailable(next);
    startTransition(async () => {
      await setSizeUnavailable({ sizeId, unavailable: next });
    });
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-0"
        checked={unavailable}
        onChange={onChange}
        disabled={pending}
      />
      <span>{unavailable ? "Unavailable" : "Available"}</span>
    </label>
  );
}
