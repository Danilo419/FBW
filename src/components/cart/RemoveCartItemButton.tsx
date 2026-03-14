"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { removeItem } from "@/app/[locale]/(store)/cart/actions";

type Props = {
  itemId: string;
  label: string;
  ariaLabel?: string;
  productName?: string;
  className?: string;
};

function fireCartUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event("cart-updated"));
  window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 150);
  window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 500);
  window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 1200);
}

export default function RemoveCartItemButton({
  itemId,
  label,
  ariaLabel,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    const formData = new FormData();
    formData.set("itemId", itemId);

    startTransition(async () => {
      try {
        await removeItem(formData);
        router.refresh();
        fireCartUpdated();
      } catch (error) {
        console.error("[RemoveCartItemButton] failed:", error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      aria-label={ariaLabel ?? label}
      className={
        className ??
        "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Removing..." : label}
    </button>
  );
}
