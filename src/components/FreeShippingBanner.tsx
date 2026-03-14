"use client";

import { Truck, CheckCircle2, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { usePathname } from "@/i18n/navigation";

type FreeShippingBannerProps = {
  subtotal: number; // valor em euros
  threshold?: number; // default 70
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function FreeShippingBanner({
  subtotal,
  threshold = 70,
}: FreeShippingBannerProps) {
  const pathname = usePathname();

  const isAdminPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.includes("/admin");

  const safeSubtotal = Math.max(0, subtotal || 0);
  const remaining = Math.max(0, threshold - safeSubtotal);
  const progress = Math.min((safeSubtotal / threshold) * 100, 100);

  const message = useMemo(() => {
    if (safeSubtotal <= 0) {
      return `Add your first item and get closer to free shipping. You need ${formatEUR(
        threshold
      )}.`;
    }

    if (remaining <= 0) {
      return "You unlocked free shipping. Your order now qualifies.";
    }

    if (remaining <= 10) {
      return `You’re almost there — only ${formatEUR(
        remaining
      )} left to unlock free shipping.`;
    }

    if (remaining <= 25) {
      return `Great choice. Add ${formatEUR(
        remaining
      )} more to get free shipping.`;
    }

    return `Free Shipping on orders above ${formatEUR(
      threshold
    )}. You’re ${formatEUR(remaining)} away.`;
  }, [remaining, safeSubtotal, threshold]);

  if (isAdminPage) return null;

  return (
    <div className="relative z-[60] w-full border-b border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-emerald-50">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-emerald-900 sm:text-sm">
            {remaining <= 0 ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Truck className="h-4 w-4 shrink-0 text-emerald-600" />
            )}

            <span>
              Free Shipping on orders above {formatEUR(threshold)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-emerald-800 sm:text-[13px]">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 shadow-inner">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="min-w-fit text-[12px] font-semibold text-emerald-900 sm:text-sm">
            {formatEUR(safeSubtotal)} / {formatEUR(threshold)}
          </div>
        </div>
      </div>
    </div>
  );
}