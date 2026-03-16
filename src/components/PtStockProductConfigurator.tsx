"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { addToCartAction } from "@/app/[locale]/(store)/cart/actions";
import { money } from "@/lib/money";
import { AnimatePresence, motion } from "framer-motion";

type ProductSizeUI = {
  id: string;
  size: string;
  available: boolean;
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  season?: string | null;
  description?: string | null;
  basePrice: number;
  images?: string[] | null;
  ptStockQty?: number | null;
  inStock?: boolean | null;
  sizes?: ProductSizeUI[] | null;
  pricePresentation?: {
    hasDiscount?: boolean;
    discountPercent?: number;
    originalUnitPriceForMoney?: number;
  } | null;
};

type Props = {
  locale: string;
  product: ProductUI;
};

type ReviewsMeta = {
  average: number;
  total: number;
};

type ReviewItem = {
  id?: string;
  rating?: number;
  title?: string | null;
  comment?: string | null;
  userName?: string | null;
  createdAt?: string | null;
};

type ReviewsResponse = {
  average?: number;
  total?: number;
  reviews?: ReviewItem[];
};

type FlyRect = { left: number; top: number; width: number; height: number };
type FlyState = { key: number; src: string; from: FlyRect; to: FlyRect };

const THUMB_W = 68;
const GAP = 8;

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpointPx);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpointPx]);

  return isMobile;
}

function getStockUrgencyMessage(stockQty: number) {
  if (stockQty <= 0) {
    return {
      text: "Sold out right now.",
      classes: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stockQty === 1) {
    return {
      text: "Hurry, only 1 unit left in stock.",
      classes: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stockQty <= 3) {
    return {
      text: `Hurry, only ${stockQty} units left in stock.`,
      classes: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  if (stockQty <= 6) {
    return {
      text: `Limited stock available — ${stockQty} units remaining.`,
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: `Ready to ship from Portugal — ${stockQty} units available.`,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

async function fetchReviewsMeta(productId: string): Promise<ReviewsResponse> {
  const res = await fetch(`/api/reviews?productId=${productId}`, {
    cache: "no-store",
  });
  return (await res.json()) as ReviewsResponse;
}

function formatReviewDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function PtStockProductConfigurator({ locale, product }: Props) {
  const router = useRouter();

  const safeImages = useMemo(() => {
    if (!Array.isArray(product?.images)) return ["/placeholder.png"];

    const arr = product.images
      .filter((img): img is string => typeof img === "string")
      .map((img) => img.trim())
      .filter(Boolean);

    return arr.length ? arr : ["/placeholder.png"];
  }, [product?.images]);

  const safeSizes = useMemo(() => {
    if (!Array.isArray(product?.sizes)) return [];

    return product.sizes
      .filter((s): s is ProductSizeUI => !!s && typeof s === "object")
      .map((s, index) => ({
        id: String(s.id ?? `size-${index}`),
        size: String(s.size ?? "").trim(),
        available: !!s.available,
      }))
      .filter((s) => s.size.length > 0);
  }, [product?.sizes]);

  const safePricePresentation = useMemo(
    () => ({
      hasDiscount: !!product?.pricePresentation?.hasDiscount,
      discountPercent: Number(product?.pricePresentation?.discountPercent ?? 0),
      originalUnitPriceForMoney:
        typeof product?.pricePresentation?.originalUnitPriceForMoney === "number"
          ? product.pricePresentation.originalUnitPriceForMoney
          : undefined,
    }),
    [product?.pricePresentation]
  );

  const safeStockQty = Number(product?.ptStockQty ?? 0);
  const safeInStock = !!product?.inStock && safeStockQty > 0;
  const safeBasePrice = Number(product?.basePrice ?? 0);
  const safeName = product?.name || "Product";

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [stickyCta, setStickyCta] = useState(false);
  const [buyNow, setBuyNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fly, setFly] = useState<FlyState | null>(null);
  const flyKeyRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const [reviewsMeta, setReviewsMeta] = useState<ReviewsMeta>({ average: 0, total: 0 });
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const activeSrc =
    safeImages[Math.min(activeIndex, Math.max(0, safeImages.length - 1))] || "/placeholder.png";

  const imgWrapRef = useRef<HTMLDivElement | null>(null);
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const isMobile = useIsMobile(1024);

  const availableSizes = useMemo(
    () => safeSizes.filter((s) => s.available && s.size),
    [safeSizes]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedSize && availableSizes.length > 0) {
      setSelectedSize(availableSizes[0].size);
    }
  }, [availableSizes, selectedSize]);

  useEffect(() => {
    if (activeIndex > safeImages.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeImages.length]);

  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);

    fetchReviewsMeta(product.id)
      .then((data) => {
        if (!alive) return;

        setReviewsMeta({
          average: Number(data?.average ?? 0),
          total: Number(data?.total ?? 0),
        });

        const safeReviews = Array.isArray(data?.reviews)
          ? data.reviews.filter((review): review is ReviewItem => !!review && typeof review === "object")
          : [];

        setReviews(safeReviews);
      })
      .catch(() => {
        if (!alive) return;
        setReviewsMeta({ average: 0, total: 0 });
        setReviews([]);
      })
      .finally(() => {
        if (!alive) return;
        setReviewsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [product.id]);

  useEffect(() => {
    const cont = thumbsRef.current;
    if (!cont) return;

    const itemWidth = THUMB_W + GAP;
    const maxScroll = cont.scrollWidth - cont.clientWidth;

    const nearEnd = activeIndex >= safeImages.length - 2;
    const nearStart = activeIndex <= 1;

    let desired = Math.max(0, (activeIndex - 2) * itemWidth);
    if (nearEnd) desired = maxScroll;
    if (nearStart) desired = 0;

    desired = Math.min(desired, Math.max(0, maxScroll));
    cont.scrollTo({ left: desired, behavior: "smooth" });
  }, [activeIndex, safeImages.length]);

  useEffect(() => {
    if (!isMobile) {
      setStickyCta(false);
      return;
    }

    const onScroll = () => {
      const btn = addBtnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const shouldShow = r.top > window.innerHeight - 20 || r.bottom < 0;
      setStickyCta(shouldShow);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  const stockMessage = useMemo(
    () => getStockUrgencyMessage(safeStockQty),
    [safeStockQty]
  );

  const canAddToCart = useMemo(() => {
    if (!safeInStock) return false;
    if (!selectedSize) return false;
    if (qty < 1) return false;
    return true;
  }, [safeInStock, selectedSize, qty]);

  const finalPrice = useMemo(() => safeBasePrice * qty, [safeBasePrice, qty]);

  const progress = useMemo(() => {
    const step1 = !!selectedSize ? 1 : 0;
    const step2 = safeInStock ? 1 : 0;
    const step3 = canAddToCart ? 1 : 0;
    return clamp(Math.round(((step1 + step2 + step3) / 3) * 100), 0, 100);
  }, [selectedSize, safeInStock, canAddToCart]);

  function validateBeforeAdd(): string | null {
    if (!safeInStock) return "This product is currently out of stock.";
    if (!selectedSize) return "Please choose a size.";
    if (qty < 1) return "Please choose a valid quantity.";
    return null;
  }

  function getCartTargetRect(): DOMRect | null {
    if (typeof document === "undefined") return null;

    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>('[data-cart-anchor="true"]')
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0;
      const style = window.getComputedStyle(el);
      return visible && style.visibility !== "hidden" && style.opacity !== "0";
    });

    if (anchors.length === 0) return null;

    const imgRect = imgWrapRef.current?.getBoundingClientRect();
    if (!imgRect) return anchors[0].getBoundingClientRect();

    const imgCx = imgRect.left + imgRect.width / 2;
    const imgCy = imgRect.top + imgRect.height / 2;

    let best = anchors[0];
    let bestDist = Infinity;

    for (const el of anchors) {
      const r = el.getBoundingClientRect();
      const cx2 = r.left + r.width / 2;
      const cy2 = r.top + r.height / 2;
      const d = Math.hypot(cx2 - imgCx, cy2 - imgCy);

      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    }

    return best.getBoundingClientRect();
  }

  function pulseCart() {
    const el = document.querySelector<HTMLElement>('[data-cart-anchor="true"]');
    if (!el) return;
    el.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
    }, 450);
  }

  function flyToCart() {
    if (typeof window === "undefined") return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      pulseCart();
      return;
    }

    const start = imgWrapRef.current?.getBoundingClientRect();
    const end = getCartTargetRect();

    if (!start || !end) {
      pulseCart();
      return;
    }

    const src = activeSrc?.startsWith("//") ? `https:${activeSrc}` : activeSrc;

    const from = {
      left: start.left,
      top: start.top,
      width: start.width,
      height: start.height,
    };

    const endCx = end.left + end.width / 2;
    const endCy = end.top + end.height / 2;
    const targetSize = Math.max(18, Math.min(34, Math.min(end.width, end.height)));

    const to = {
      left: endCx - targetSize / 2,
      top: endCy - targetSize / 2,
      width: targetSize,
      height: targetSize,
    };

    flyKeyRef.current += 1;
    setFly({ key: flyKeyRef.current, src, from, to });
  }

  function buildOptionsForCart() {
    return {
      size: selectedSize,
    } as Record<string, string | null>;
  }

  function addToCartCore(opts?: { goCheckout?: boolean }) {
    const msg = validateBeforeAdd();

    if (msg && !canAddToCart) {
      setError(msg);
      document
        .querySelector('[data-section="size"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const optionsForCart = buildOptionsForCart();

    startTransition(async () => {
      try {
        await addToCartAction({
          productId: product.id,
          qty,
          options: optionsForCart,
          personalization: null,
        });

        router.refresh();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cart-updated"));
          window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 150);
          window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 500);
          window.setTimeout(() => window.dispatchEvent(new Event("cart-updated")), 1200);
        }

        setJustAdded(true);
        setShowToast(true);
        setError(null);

        flyToCart();

        window.setTimeout(() => setShowToast(false), 2200);
        window.setTimeout(() => setJustAdded(false), 900);

        if (opts?.goCheckout) router.push("/checkout");
      } catch {
        setError("Something went wrong while adding this product to the cart.");
      }
    });
  }

  function addToCart() {
    setBuyNow(false);
    addToCartCore({ goCheckout: false });
  }

  function onBuyNow() {
    setBuyNow(true);
    addToCartCore({ goCheckout: true });
  }

  const goPrev = () => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="w-full overflow-x-hidden px-2">
      <div className="relative mx-auto flex w-full max-w-[260px] flex-col gap-6 sm:max-w-[520px] lg:max-w-none lg:flex-row lg:items-start lg:gap-8">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {showToast ? "Item added to cart." : ""}
        </div>

        {mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {fly && (
                <motion.img
                  key={`fly-${fly.key}`}
                  src={fly.src}
                  alt=""
                  initial={{
                    left: fly.from.left,
                    top: fly.from.top,
                    width: fly.from.width,
                    height: fly.from.height,
                    opacity: 0.95,
                    rotate: 0,
                    scale: 1,
                  }}
                  animate={{
                    left: fly.to.left,
                    top: fly.to.top,
                    width: fly.to.width,
                    height: fly.to.height,
                    opacity: 0,
                    rotate: 8,
                    scale: 0.2,
                    filter: "blur(1px)",
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationComplete={() => {
                    setFly(null);
                    pulseCart();
                  }}
                  style={{
                    position: "fixed",
                    zIndex: 9999,
                    pointerEvents: "none",
                    objectFit: "contain",
                    borderRadius: 12,
                    willChange: "left, top, width, height, opacity, transform",
                  }}
                />
              )}
            </AnimatePresence>,
            document.body
          )}

        <div className="w-full rounded-2xl border bg-white p-3 lg:w-[560px] lg:flex-none lg:self-start lg:p-6 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {safeImages.length > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="group hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:inline-flex"
              >
                <ChevronLeft />
              </button>
            ) : (
              <div className="hidden h-10 w-10 shrink-0 lg:block" />
            )}

            <div
              ref={imgWrapRef}
              className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-xl bg-white sm:max-w-[320px] lg:max-w-none"
            >
              <Image
                src={activeSrc}
                alt={safeName}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 540px, 100vw"
                priority
                unoptimized={isExternalUrl(activeSrc)}
              />

              {safePricePresentation.hasDiscount && (
                <div className="absolute left-3 top-3 flex items-center justify-center rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-md sm:left-4 sm:top-4 sm:text-sm">
                  -{safePricePresentation.discountPercent}%
                </div>
              )}

              {safeImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous image"
                    className="absolute left-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-md backdrop-blur transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next image"
                    className="absolute right-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-md backdrop-blur transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>

            {safeImages.length > 1 ? (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="group hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:inline-flex"
              >
                <ChevronRight />
              </button>
            ) : (
              <div className="hidden h-10 w-10 shrink-0 lg:block" />
            )}
          </div>

          {safeImages.length > 1 && (
            <div className="mt-3">
              <div
                ref={thumbsRef}
                className="no-scrollbar mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 pr-6 [scrollbar-width:none] [-ms-overflow-style:none]"
              >
                <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>
                <div className="inline-flex gap-2" style={{ scrollBehavior: "smooth" }}>
                  {safeImages.map((src, i) => {
                    const isActive = i === activeIndex;
                    return (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        aria-label={`Image ${i + 1}`}
                        className={cx(
                          "relative h-[52px] w-[42px] flex-none rounded-xl border transition focus:outline-none sm:h-[60px] sm:w-[50px] lg:h-[82px] lg:w-[68px]",
                          isActive ? "border-transparent" : "hover:opacity-90"
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-600"
                          />
                        )}
                        <span className="absolute inset-[3px] overflow-hidden rounded-[10px]">
                          <Image
                            src={src}
                            alt={`thumb ${i + 1}`}
                            fill
                            className="object-contain"
                            sizes="42px"
                            unoptimized={isExternalUrl(src)}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <TrustPill icon={<ShieldIcon />} text="Secure checkout" />
            <TrustPill icon={<TruckIcon />} text="Tracked shipping" />
            <TrustPill icon={<ChatIcon />} text="Fast support" />
          </div>
        </div>

        <div className="card min-w-0 w-full flex-1 space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
          <header className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div className="h-2 bg-blue-600" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {product.team && product.team !== safeName && (
                  <div className="mb-1 text-xs font-medium text-emerald-700 sm:text-sm">
                    {product.team}
                  </div>
                )}

                <h1 className="text-sm font-extrabold leading-snug tracking-tight sm:text-base lg:text-2xl">
                  {safeName}
                </h1>

                <div className="mt-1 flex items-baseline gap-2">
                  {safePricePresentation.hasDiscount &&
                    safePricePresentation.originalUnitPriceForMoney != null && (
                      <span className="text-[11px] text-gray-400 line-through sm:text-xs">
                        {money(safePricePresentation.originalUnitPriceForMoney)}
                      </span>
                    )}

                  <span className="text-sm font-semibold text-gray-900 sm:text-lg lg:text-xl">
                    {money(safeBasePrice)}
                  </span>

                  {safePricePresentation.hasDiscount && (
                    <span className="ml-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 sm:text-xs">
                      Save {safePricePresentation.discountPercent}%
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 sm:text-xs">
                  {reviewsLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
                      <span className="h-3 w-14 animate-pulse rounded-full bg-gray-200" />
                    </span>
                  ) : reviewsMeta.total > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <ReadOnlyStars value={reviewsMeta.average} />
                      <span className="font-semibold">{reviewsMeta.average.toFixed(1)}</span>
                      <span className="text-gray-500">({reviewsMeta.total})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <ReadOnlyStars value={0} />
                      No reviews yet
                    </span>
                  )}

                  <span className="inline-flex items-center gap-2">
                    <TruckIcon className="h-3.5 w-3.5" />
                    PT Stock — fast shipping from Portugal
                  </span>
                </div>
              </div>
            </div>

            {product.season && (
              <div className="text-xs text-gray-600 sm:text-sm">
                Season: <span className="font-medium text-gray-900">{product.season}</span>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 sm:text-sm"
                  role="status"
                >
                  <span className="font-semibold">Heads up:</span> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
              Stock status
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold sm:text-sm",
                  safeInStock
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-700"
                )}
              >
                {safeInStock ? "In stock" : "Out of stock"}
              </span>

              {safeInStock && (
                <span className="text-[11px] text-gray-600 sm:text-sm">
                  {safeStockQty} units available
                </span>
              )}
            </div>

            <div
              className={cx(
                "mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold sm:text-sm",
                stockMessage.classes
              )}
            >
              {stockMessage.text}
            </div>
          </div>

          <div data-section="size" className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
              Size <span className="text-red-500">*</span>
            </div>

            {safeSizes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {safeSizes.map((s, index) => {
                  const unavailable = !s.available;
                  const isActive = selectedSize === s.size && !unavailable;

                  return (
                    <button
                      key={s.id || `size-${index}`}
                      type="button"
                      onClick={() => {
                        if (unavailable) return;
                        setSelectedSize(s.size);
                        setError(null);
                      }}
                      disabled={unavailable}
                      aria-disabled={unavailable}
                      className={cx(
                        "rounded-xl border px-2.5 py-1.5 text-[11px] transition sm:text-xs lg:text-sm",
                        unavailable && "cursor-not-allowed opacity-50 line-through",
                        !unavailable && !isActive && "hover:bg-gray-50",
                        isActive &&
                          !unavailable &&
                          "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      )}
                      aria-pressed={isActive}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No sizes available</div>
            )}

            <p className="mt-2 text-[11px] text-gray-500 sm:text-xs">
              Only the available PT Stock sizes can be purchased.
            </p>
          </div>

          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  disabled={pending}
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-sm">{qty}</span>
                <button
                  type="button"
                  className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  disabled={pending}
                >
                  +
                </button>
              </div>

              <div className="text-right sm:text-left">
                <div className="text-xs text-gray-600 sm:text-sm">Total</div>
                <div className="text-base font-semibold sm:text-lg">{money(finalPrice)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <motion.button
              ref={addBtnRef}
              onClick={addToCart}
              className={cx(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:text-base",
                justAdded && "bg-green-600 hover:bg-green-600",
                "disabled:opacity-60"
              )}
              disabled={pending || !canAddToCart}
              animate={justAdded ? { scale: [1, 1.05, 1] } : {}}
              transition={{ type: "spring", stiffness: 600, damping: 20, duration: 0.4 }}
            >
              {justAdded ? (
                <>
                  <CheckIcon />
                  Added
                </>
              ) : pending && !buyNow ? (
                "Adding..."
              ) : (
                <>
                  <CartIcon />
                  Add to cart
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={onBuyNow}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 sm:text-base"
              disabled={pending || !canAddToCart}
            >
              {pending && buyNow ? "Processing..." : "Buy now"}
            </button>
          </div>

          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="mb-2 text-[11px] font-semibold text-gray-700 sm:text-sm">
              Shipping information
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>1 shirt</span>
                <span className="font-semibold text-gray-900">4.99€</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>2 shirts</span>
                <span className="font-semibold text-gray-900">6.99€</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span>3 or more</span>
                <span className="font-semibold text-emerald-700">Free</span>
              </div>
            </div>
          </div>

          <InfoAccordions />

          <div id="reviews" className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900 sm:text-base">
                  Reviews
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600 sm:text-sm">
                  {reviewsLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
                      <span className="h-3 w-14 animate-pulse rounded-full bg-gray-200" />
                    </span>
                  ) : reviewsMeta.total > 0 ? (
                    <>
                      <ReadOnlyStars value={reviewsMeta.average} />
                      <span className="font-semibold text-gray-900">
                        {reviewsMeta.average.toFixed(1)}
                      </span>
                      <span className="text-gray-500">({reviewsMeta.total})</span>
                    </>
                  ) : (
                    <>
                      <ReadOnlyStars value={0} />
                      <span>No reviews yet</span>
                    </>
                  )}
                </div>
              </div>

              {reviewsMeta.total > 0 && (
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  Verified customer feedback
                </div>
              )}
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border bg-white p-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" />
                    <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review, index) => (
                  <div
                    key={review.id || `${review.userName || "customer"}-${index}`}
                    className="rounded-2xl border bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">
                          {review.userName?.trim() || "Customer"}
                        </div>
                        <div className="mt-1">
                          <ReadOnlyStars value={Number(review.rating ?? 0)} size={14} />
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatReviewDate(review.createdAt)}
                      </div>
                    </div>

                    {review.title?.trim() && (
                      <div className="mt-3 text-sm font-semibold text-gray-900">
                        {review.title}
                      </div>
                    )}

                    {review.comment?.trim() && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-white p-4 text-sm text-gray-600">
                There are no reviews yet. The first customer review will appear here.
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="grid gap-2 text-[11px] text-gray-700 sm:grid-cols-3 sm:text-xs">
              <div className="flex items-start gap-2">
                <ShieldIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">Secure payment</div>
                  <div className="text-gray-500">Encrypted checkout</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <TruckIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">Tracked shipping</div>
                  <div className="text-gray-500">Fast shipping from Portugal</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ChatIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">Fast support</div>
                  <div className="text-gray-500">We reply quickly</div>
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="rounded-2xl border bg-white/70 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">
                Description
              </div>

              <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/${locale}/pt-stock`}
              className="inline-flex items-center rounded-xl border px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Back to PT Stock
            </Link>

            <Link
              href={`/${locale}/clubs`}
              className="inline-flex items-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900"
            >
              Browse more
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {showToast && (
            <motion.div
              key="cart-toast"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:px-0"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="h-4 w-4 text-green-700" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold">Added to cart</div>
                  <div className="text-gray-600">Your item is ready in the cart.</div>
                </div>
                <button
                  type="button"
                  className="ml-2 rounded-lg px-2 py-1 text-xs hover:bg-gray-100"
                  onClick={() => setShowToast(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMobile && stickyCta && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur"
            >
              <div className="mx-auto flex max-w-[520px] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-600">Total</div>
                  <div className="truncate text-sm font-semibold">{money(finalPrice)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!canAddToCart) {
                      setError(validateBeforeAdd());
                      document
                        .querySelector('[data-section="size"]')
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      return;
                    }
                    addToCart();
                  }}
                  className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  disabled={pending}
                >
                  Add
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!canAddToCart) {
                      setError(validateBeforeAdd());
                      document
                        .querySelector('[data-section="size"]')
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      return;
                    }
                    onBuyNow();
                  }}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                  disabled={pending}
                >
                  Buy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoAccordions() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white/70">
      <AccordionRow icon={<TruckIcon className="h-4 w-4" />} title="Shipping & delivery" defaultOpen>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              <b>Fast Portugal dispatch.</b> PT Stock items are shipped from Portugal.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              A <b>tracking number</b> is provided when available.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Support replies quickly if you need help with your order.</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<RotateIcon className="h-4 w-4" />} title="Returns & support">
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>If there is a problem with your order, contact support as soon as possible.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Keep the product <b>unused</b> and in good condition if you need assistance.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Availability may change quickly on PT Stock items.</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<StarBadgeIcon className="h-4 w-4" />} title="Quality details">
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Carefully selected football shirts and PT Stock products.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Comfortable fit and quality finish.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>Choose an available size before adding to cart.</span>
          </li>
        </ul>
      </AccordionRow>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/10" aria-hidden="true" />;
}

function AccordionRow({
  icon,
  title,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={!!defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/60">
        <span className="text-gray-800">{icon}</span>
        <span className="text-sm font-semibold text-gray-900 sm:text-base">{title}</span>
        <span className="ml-auto text-gray-600">
          <ChevronDownIcon className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function ReadOnlyStars({ value, size = 14 }: { value: number; size?: number }) {
  const v = clamp(value, 0, 5);
  const full = Math.floor(v);
  const partial = v - full;

  return (
    <div className="inline-flex gap-1 align-middle" aria-label={`${v.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full ? 1 : i === full ? partial : 0;
        return (
          <div className="relative" key={i} style={{ width: size, height: size }}>
            <StarShape className="absolute inset-0 text-gray-300" size={size} fill="currentColor" />
            <StarShape
              className="absolute inset-0 text-amber-500"
              size={size}
              fill="currentColor"
              style={{ clipPath: `inset(0 ${100 - filled * 100}% 0 0)` }}
            />
            <StarShape className="absolute inset-0 text-black/10" size={size} fill="none" />
          </div>
        );
      })}
    </div>
  );
}

function TrustPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border bg-gray-50 px-2.5 py-2 text-[11px] font-semibold text-gray-700 sm:text-xs">
      <span className="text-gray-800">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} className={cx("h-5 w-5", props.className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 7L9 18l-5-5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx(
        "mx-auto h-5 w-5 text-gray-900 transition-transform group-hover:scale-110",
        props.className
      )}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx(
        "mx-auto h-5 w-5 text-gray-900 transition-transform group-hover:scale-110",
        props.className
      )}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("h-5 w-5", props.className)} fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarShape({
  size,
  className,
  fill,
  style,
}: {
  size: number;
  className?: string;
  fill: "none" | "currentColor";
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M12 2l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.9 5.82 21l1.18-6.87-5-4.87 6.91-1L12 2z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TruckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M3 7h11v10H3V7zM14 10h4l3 3v4h-7v-7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 3l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("h-5 w-5", props.className)} fill="none" aria-hidden="true">
      <path
        d="M6 7h15l-2 9H7L6 7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M6 7l-1-3H2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M4 5h16v11H7l-3 3V5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12h6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RotateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M21 12a9 9 0 10-3 6.7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M21 7v5h-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarBadgeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 14.9 7.4 16.4l.9-5.2-3.8-3.7 5.2-.8L12 2z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M7 21l5-2 5 2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}