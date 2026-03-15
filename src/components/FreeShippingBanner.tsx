"use client";

import { Truck, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

type FreeShippingBannerProps = {
  subtotal?: number;
  threshold?: number;
};

function formatEUR(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function FreeShippingBanner({
  subtotal = 0,
  threshold = 70,
}: FreeShippingBannerProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("FreeShippingBanner");

  const isAdminPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.includes("/admin");

  const [liveSubtotal, setLiveSubtotal] = useState<number>(
    Math.max(0, Number(subtotal) || 0)
  );
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    setLiveSubtotal(Math.max(0, Number(subtotal) || 0));
  }, [subtotal]);

  async function refreshSubtotal() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch(`/api/cart/subtotal?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = (await res.json()) as { subtotal?: number };
      setLiveSubtotal(Math.max(0, Number(data?.subtotal) || 0));
    } catch {
      // ignore
    } finally {
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    refreshSubtotal();

    const onCartUpdated = () => {
      refreshSubtotal();
      window.setTimeout(() => refreshSubtotal(), 150);
      window.setTimeout(() => refreshSubtotal(), 500);
      window.setTimeout(() => refreshSubtotal(), 1200);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSubtotal();
      }
    };

    window.addEventListener("cart-updated", onCartUpdated);
    window.addEventListener("focus", refreshSubtotal);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("cart-updated", onCartUpdated);
      window.removeEventListener("focus", refreshSubtotal);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const remaining = Math.max(0, threshold - liveSubtotal);
  const targetProgress = clamp((liveSubtotal / threshold) * 100, 0, 100);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setAnimatedProgress(targetProgress);
    });

    return () => window.cancelAnimationFrame(id);
  }, [targetProgress]);

  const thresholdFormatted = formatEUR(threshold, locale);
  const subtotalFormatted = formatEUR(liveSubtotal, locale);
  const remainingFormatted = formatEUR(remaining, locale);

  const message = useMemo(() => {
    if (liveSubtotal <= 0) {
      return t("messageEmpty", { threshold: thresholdFormatted });
    }

    if (remaining <= 0) {
      return t("messageUnlocked");
    }

    if (remaining <= 10) {
      return t("messageAlmostThere", { remaining: remainingFormatted });
    }

    if (remaining <= 25) {
      return t("messageGreatChoice", { remaining: remainingFormatted });
    }

    return t("messageDefault", {
      threshold: thresholdFormatted,
      remaining: remainingFormatted,
    });
  }, [liveSubtotal, remaining, remainingFormatted, t, thresholdFormatted]);

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
            <span>{t("title", { threshold: thresholdFormatted })}</span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-emerald-800 sm:text-[13px]">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 shadow-inner">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>

          <div className="min-w-fit text-[12px] font-semibold text-emerald-900 sm:text-sm">
            {subtotalFormatted} / {thresholdFormatted}
          </div>
        </div>
      </div>
    </div>
  );
}
