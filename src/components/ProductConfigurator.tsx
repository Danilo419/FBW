// src/components/ProductConfigurator.tsx
"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/(store)/cart/actions";
import { money } from "@/lib/money";
import { AnimatePresence, motion } from "framer-motion";

/* ====================== MAPA DE DESCONTOS ======================
 * chave  = preço atual (EUROS, como aparece no site, ex: "34.99")
 * valor  = preço ORIGINAL antes do desconto (em euros)
 */
const SALE_MAP_EUR: Record<string, number> = {
  "29.99": 70,
  "34.99": 100,
  "39.99": 120,
  "44.99": 150,
  "49.99": 165,
  "59.99": 200,
  "69.99": 230,
};

/* ====================== UI Types ====================== */
type OptionValueUI = { id: string; value: string; label: string; priceDelta: number };
type OptionGroupUI = {
  id: string;
  key: string;
  label: string;
  type: "SIZE" | "RADIO" | "ADDON";
  required: boolean;
  values: OptionValueUI[];
};
type SizeUI = { id: string; size: string; stock?: number | null; available?: boolean | null };
type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number;
  images: string[];
  optionGroups: OptionGroupUI[];
  sizes?: SizeUI[];
  badges?: string[];
};

type SelectedState = Record<string, string | string[] | null>;
type Props = { product: ProductUI };

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
const KID_SIZES = ["2-3", "3-4", "4-5", "6-7", "8-9", "10-11", "12-13"] as const;
const isKidProduct = (name: string) => /kid/i.test(name);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ============ Badge helpers ============ */
const BADGE_LABELS: Record<string, string> = {
  "premier-league-regular": "Premier League – League Badge",
  "premier-league-champions": "Premier League – Champions (Gold)",
  "la-liga-regular": "La Liga – League Badge",
  "la-liga-champions": "La Liga – Champion",
  "serie-a-regular": "Serie A – League Badge",
  "serie-a-scudetto": "Italy – Scudetto (Serie A Champion)",
  "bundesliga-regular": "Bundesliga – League Badge",
  "bundesliga-champions": "Bundesliga – Champion (Meister Badge)",
  "ligue1-regular": "Ligue 1 – League Badge",
  "ligue1-champions": "Ligue 1 – Champion",
  "primeira-liga-regular": "Primeira Liga – League Badge",
  "primeira-liga-champions": "Primeira Liga – Champion",
  "eredivisie-regular": "Eredivisie – League Badge",
  "eredivisie-champions": "Eredivisie – Champion",
  "scottish-premiership-regular": "Scottish Premiership – League Badge",
  "scottish-premiership-champions": "Scottish Premiership – Champion",
  "mls-regular": "MLS – League Badge",
  "mls-champions": "MLS – Champions (MLS Cup Holders)",
  "brasileirao-regular": "Brasileirão – League Badge",
  "brasileirao-champions": "Brasileirão – Champion",
  "super-lig-regular": "Süper Lig – League Badge",
  "super-lig-champions": "Süper Lig – Champion",
  "spl-saudi-regular": "Saudi Pro League – League Badge",
  "spl-saudi-champions": "Saudi Pro League – Champion",
  "ucl-regular": "UEFA Champions League – Starball Badge",
  "ucl-winners": "UEFA Champions League – Winners Badge",
  "uel-regular": "UEFA Europa League – Badge",
  "uel-winners": "UEFA Europa League – Winners Badge",
  "uecl-regular": "UEFA Europa Conference League – Badge",
  "uecl-winners": "UEFA Europa Conference League – Winners Badge",
  "club-world-cup-champions": "FIFA Club World Cup – Champions Badge",
};

function humanizeBadge(value: string) {
  if (BADGE_LABELS[value]) return BADGE_LABELS[value];
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function competitionKey(value: string, label?: string) {
  const take = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();
  if (value.includes("_")) return take(value.split("_")[0]);
  const source = label || value;
  const parts = source.split(/–|—|-/);
  if (parts.length > 1) return take(parts[0]);
  const m = (value.match(/^[A-Za-z]+/) || [value])[0];
  return take(m);
}

/* ====================== Fly types ====================== */
type FlyRect = { left: number; top: number; width: number; height: number };
type FlyState = {
  key: number;
  src: string;
  from: FlyRect;
  to: FlyRect;
};

/* ====================== Unicode helpers ====================== */
/**
 * ✅ Mantém letras com acentos (Unicode), espaços e . ' -
 * - remove números/símbolos (para o nome)
 * - colapsa espaços
 * - uppercase
 * - corta a 14
 */
function sanitizeNameUnicode(input: string, maxLen = 14) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^\p{L} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

/**
 * ✅ Aceita 3 dígitos (0–999)
 */
function sanitizeNumber(input: string, maxLen = 3) {
  return input.replace(/\D/g, "").slice(0, maxLen);
}

/* ====================== Small UI helpers ====================== */
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

function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function formatDeliveryRangeISO(locale: "PT" | "EU") {
  // copy genérica e “safe” (sem prometer datas exatas)
  return locale === "PT" ? "Estimated delivery: 4–9 business days" : "Estimated delivery: 6–12 business days";
}

function getCountryHint(): "PT" | "EU" {
  try {
    const lang = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
    if (lang.startsWith("pt")) return "PT";
  } catch {}
  return "EU";
}

export default function ProductConfigurator({ product }: Props) {
  const router = useRouter();

  const [selected, setSelected] = useState<SelectedState>({});
  const [custName, setCustName] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [qty, setQty] = useState(1);

  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // ✅ fly animation state (Framer Motion)
  const [fly, setFly] = useState<FlyState | null>(null);
  const flyKeyRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  // ✅ conversion-focused UX states
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<null | "shipping" | "returns" | "quality" | "size">(null);
  const [showZoom, setShowZoom] = useState(false);
  const [stickyCta, setStickyCta] = useState(false);
  const [buyNow, setBuyNow] = useState(false);

  const isMobile = useIsMobile(1024);
  useLockBodyScroll(showZoom);

  useEffect(() => setMounted(true), []);

  /* ---------- DESCONTO ---------- */
  const rawUnitPrice = product.basePrice;
  const candidateEur1 = rawUnitPrice;
  const candidateEur2 = rawUnitPrice / 100;

  let salePriceEur: number;
  if (SALE_MAP_EUR[candidateEur1.toFixed(2)]) {
    salePriceEur = candidateEur1;
  } else if (SALE_MAP_EUR[candidateEur2.toFixed(2)]) {
    salePriceEur = candidateEur2;
  } else {
    salePriceEur = rawUnitPrice > 100 ? candidateEur2 : candidateEur1;
  }

  const saleKey = salePriceEur.toFixed(2);
  const originalPriceEur = SALE_MAP_EUR[saleKey];

  let originalUnitPriceForMoney: number | undefined;
  if (typeof originalPriceEur === "number") {
    const factor = rawUnitPrice / salePriceEur;
    originalUnitPriceForMoney = originalPriceEur * factor;
  }

  const hasDiscount = typeof originalPriceEur === "number" && originalPriceEur > salePriceEur;

  const discountPercent = hasDiscount
    ? Math.round(((originalPriceEur - salePriceEur) / originalPriceEur) * 100)
    : 0;

  /* ---------- Images ---------- */
  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const activeSrc = images[Math.min(activeIndex, images.length - 1)];
  const imgWrapRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Thumbs ---------- */
  const THUMB_W = 68;
  const GAP = 8;
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cont = thumbsRef.current;
    if (!cont) return;
    const itemWidth = THUMB_W + GAP;
    const maxScroll = cont.scrollWidth - cont.clientWidth;
    let desired = Math.max(0, (activeIndex - 2) * itemWidth);
    desired = Math.min(desired, Math.max(0, maxScroll));
    cont.scrollTo({ left: desired, behavior: "smooth" });
  }, [activeIndex]);

  /* ---------- Sizes ---------- */
  const kid = isKidProduct(product.name);

  const sizes: SizeUI[] = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes.map((s) => ({
        id: s.id ?? s.size,
        size: String(s.size).toUpperCase(),
        stock: typeof s.stock === "number" ? s.stock : null,
        available: s.available ?? true,
      }));
    }
    const fallback = (kid ? KID_SIZES : ADULT_SIZES).map((s) => ({
      id: s,
      size: s,
      stock: 999,
      available: true,
    }));
    return fallback;
  }, [product.sizes, kid]);

  const isUnavailable = (s: SizeUI) =>
    s.available === false || (typeof s.stock === "number" && s.stock <= 0);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const pickSize = (size: string) => {
    const found = sizes.find((s) => s.size === size);
    if (!found || isUnavailable(found)) return;
    setSelectedSize(size);
    setSelected((st) => ({ ...st, size }));
    setError(null);
  };

  useEffect(() => {
    if (!selectedSize) return;
    const found = sizes.find((s) => s.size === selectedSize);
    if (!found || isUnavailable(found)) {
      setSelectedSize(null);
      setSelected((st) => ({ ...st, size: null }));
    }
  }, [sizes, selectedSize]);

  /* ---------- Scarcity / stock hint ---------- */
  const stockHint = useMemo(() => {
    const sel = selectedSize ? sizes.find((s) => s.size === selectedSize) : null;
    const stock = sel?.stock;
    if (!sel) return null;
    if (isUnavailable(sel)) return { tone: "danger" as const, text: "This size is sold out." };
    if (typeof stock === "number") {
      if (stock <= 3) return { tone: "warning" as const, text: `Only ${stock} left in this size.` };
      if (stock <= 8) return { tone: "info" as const, text: "Low stock in this size." };
    }
    return { tone: "ok" as const, text: "In stock — ready to ship." };
  }, [selectedSize, sizes]);

  /* ---------- Groups ---------- */
  const customizationGroupFromDb = product.optionGroups.find((g) => g.key === "customization");

  const badgesGroupVirtual: OptionGroupUI | undefined = useMemo(() => {
    if (!product.badges || product.badges.length === 0) return undefined;
    const values: OptionValueUI[] = product.badges.map((v) => ({
      id: v,
      value: v,
      label: humanizeBadge(v),
      priceDelta: 0,
    }));
    return {
      id: "badges-virtual",
      key: "badges",
      label: "Badges",
      type: "ADDON",
      required: false,
      values,
    };
  }, [product.badges]);

  const badgesGroup: OptionGroupUI | undefined = useMemo(() => {
    const real = product.optionGroups.find((g) => g.key === "badges");
    const virtual = badgesGroupVirtual;

    if (!real && !virtual) return undefined;
    if (real && !virtual) return real;
    if (!real && virtual) return virtual;

    const map = new Map<string, OptionValueUI>(real!.values.map((v) => [v.value, v]));
    for (const v of virtual!.values) {
      if (!map.has(v.value)) map.set(v.value, v);
    }
    return { ...real!, values: Array.from(map.values()) };
  }, [product.optionGroups, badgesGroupVirtual]);

  const effectiveCustomizationGroup: OptionGroupUI | undefined = useMemo(() => {
    if (!customizationGroupFromDb) return undefined;

    const original = customizationGroupFromDb;
    const filtered = badgesGroup
      ? original.values
      : original.values.filter((v) => !/badge/i.test(v.value) && !/badge/i.test(v.label));

    if ((filtered?.length ?? 0) === 0) return undefined;
    return { ...original, values: filtered };
  }, [customizationGroupFromDb, badgesGroup]);

  const otherGroups = product.optionGroups.filter(
    (g) => !["size", "customization", "badges", "shorts", "socks"].includes(g.key)
  );

  const customization = selected["customization"] ?? "";

  useEffect(() => {
    if (!effectiveCustomizationGroup && customization) {
      setSelected((s) => ({ ...s, customization: null }));
    }
  }, [effectiveCustomizationGroup, customization]);

  useEffect(() => {
    if (!badgesGroup && typeof customization === "string" && /badge/i.test(customization)) {
      setSelected((s) => ({ ...s, customization: "none" }));
    }
  }, [badgesGroup, customization]);

  const showNameNumber =
    !!effectiveCustomizationGroup &&
    typeof customization === "string" &&
    customization.toLowerCase().includes("name-number");

  const showBadgePicker =
    typeof customization === "string" &&
    customization.toLowerCase().includes("badge") &&
    !!badgesGroup;

  const setRadio = (key: string, value: string) => {
    setSelected((s) => ({ ...s, [key]: value || null }));
    setError(null);
  };

  function toggleAddon(key: string, value: string, checked: boolean) {
    setSelected((prev) => {
      const current = prev[key];
      let arr: string[] = Array.isArray(current)
        ? [...current]
        : typeof current === "string" && current
        ? [current]
        : [];
      if (checked) {
        if (!arr.includes(value)) arr.push(value);
      } else {
        arr = arr.filter((v) => v !== value);
      }
      return { ...prev, [key]: arr.length ? arr : null };
    });
    setError(null);
  }

  function toggleBadge(group: OptionGroupUI, value: string, checked: boolean) {
    setSelected((prev) => {
      const current = prev[group.key];
      let arr: string[] = Array.isArray(current)
        ? [...current]
        : typeof current === "string" && current
        ? [current]
        : [];

      const mapByValue = new Map(group.values.map((v) => [v.value, v]));
      const newV = mapByValue.get(value);
      const newKey = competitionKey(value, newV?.label);

      if (checked) {
        arr = arr.filter((v) => {
          const vv = mapByValue.get(v);
          const k = competitionKey(v, vv?.label);
          return k !== newKey;
        });
        if (!arr.includes(value)) arr.push(value);
      } else {
        arr = arr.filter((v) => v !== value);
      }
      return { ...prev, [group.key]: arr.length ? arr : null };
    });
    setError(null);
  }

  /* ---------- Price ---------- */
  const unitJerseyPrice = useMemo(() => product.basePrice, [product.basePrice]);
  const finalPrice = useMemo(() => unitJerseyPrice * qty, [unitJerseyPrice, qty]);

  /* ---------- Sanitize (✅ supports accents) ---------- */
  const safeName = useMemo(() => sanitizeNameUnicode(custName, 14), [custName]);
  const safeNumber = useMemo(() => sanitizeNumber(custNumber, 3), [custNumber]);

  /* ---------- Validation (required groups) ---------- */
  const requiredGroups = useMemo(() => {
    const groups: OptionGroupUI[] = [];
    // Size is handled separately, but keep mental model
    if (effectiveCustomizationGroup) groups.push(effectiveCustomizationGroup);
    if (showBadgePicker && badgesGroup) groups.push(badgesGroup);
    for (const g of otherGroups) groups.push(g);
    return groups.filter((g) => g.required);
  }, [effectiveCustomizationGroup, showBadgePicker, badgesGroup, otherGroups]);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    for (const g of requiredGroups) {
      const v = selected[g.key];
      if (g.type === "RADIO") {
        if (!v || typeof v !== "string") missing.push(g.label);
      } else {
        // ADDON required => at least one chosen
        const arr = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
        if (arr.length === 0) missing.push(g.label);
      }
    }
    return missing;
  }, [requiredGroups, selected]);

  const personalizationInvalid = useMemo(() => {
    if (!showNameNumber) return false;
    // se a pessoa escolheu name/number, normalmente quer pelo menos 1 campo preenchido,
    // mas não vamos “travar” conversão. Só avisar se ambos vazios.
    const bothEmpty = safeName.length === 0 && safeNumber.length === 0;
    return bothEmpty;
  }, [showNameNumber, safeName, safeNumber]);

  const canAddToCart = useMemo(() => {
    if (!selectedSize) return false;
    if (qty < 1) return false;
    if (missingRequired.length > 0) return false;
    return true;
  }, [selectedSize, qty, missingRequired]);

  const progress = useMemo(() => {
    // 3 passos: size / options / add
    const step1 = !!selectedSize ? 1 : 0;
    const step2 = missingRequired.length === 0 ? 1 : 0;
    const step3 = canAddToCart ? 1 : 0;
    const pct = Math.round(((step1 + step2 + step3) / 3) * 100);
    return clamp(pct, 0, 100);
  }, [selectedSize, missingRequired.length, canAddToCart]);

  /* ---------- Fly-to-cart helpers ---------- */
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
    setTimeout(() => el.classList.remove("ring-2", "ring-blue-400", "ring-offset-2"), 450);
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

    const from: FlyRect = {
      left: start.left,
      top: start.top,
      width: start.width,
      height: start.height,
    };

    const endCx = end.left + end.width / 2;
    const endCy = end.top + end.height / 2;
    const targetSize = Math.max(18, Math.min(34, Math.min(end.width, end.height)));
    const to: FlyRect = {
      left: endCx - targetSize / 2,
      top: endCy - targetSize / 2,
      width: targetSize,
      height: targetSize,
    };

    flyKeyRef.current += 1;
    setFly({ key: flyKeyRef.current, src, from, to });
  }

  /* ---------- Navegação ---------- */
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") {
        setShowZoom(false);
        setOpenFaq(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  /* ---------- Sticky CTA (mobile) ---------- */
  const addBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isMobile) {
      setStickyCta(false);
      return;
    }
    const onScroll = () => {
      const btn = addBtnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      // quando o botão “sai” do ecrã (abaixo), mostra sticky
      const shouldShow = r.top > window.innerHeight - 20 || r.bottom < 0;
      setStickyCta(shouldShow);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  /* ---------- Add to cart ---------- */
  function buildOptionsForCart() {
    const optionsForCart: Record<string, string | null> = Object.fromEntries(
      Object.entries(selected).map(([k, v]) => [
        k,
        Array.isArray(v) ? (v.length ? v.join(",") : null) : v ?? null,
      ])
    );
    return optionsForCart;
  }

  function validateBeforeAdd(): string | null {
    if (!selectedSize) return "Please choose a size to continue.";
    const sel = sizes.find((s) => s.size === selectedSize);
    if (!sel || isUnavailable(sel)) return "This size is unavailable. Please choose another.";
    if (qty < 1) return "Quantity must be at least 1.";
    if (missingRequired.length > 0) return `Please select: ${missingRequired.join(", ")}.`;
    // não bloquear, mas avisar (em vez de impedir)
    if (personalizationInvalid) return "Tip: Add a name or number (optional) to make it unique.";
    return null;
  }

  function addToCartCore(opts?: { goCheckout?: boolean }) {
    const msg = validateBeforeAdd();
    if (msg && !canAddToCart) {
      setError(msg);
      // scroll suave para a zona de tamanho se ainda não escolheu
      if (!selectedSize) {
        document.querySelector('[data-section="size"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const optionsForCart = buildOptionsForCart();

    startTransition(async () => {
      try {
        await addToCartAction({
          productId: product.id,
          qty,
          options: optionsForCart,
          personalization: showNameNumber ? { name: safeName, number: safeNumber } : null,
        });

        setJustAdded(true);
        setShowToast(true);
        setError(null);

        flyToCart();

        window.setTimeout(() => setShowToast(false), 2200);
        window.setTimeout(() => setJustAdded(false), 900);

        if (opts?.goCheckout) {
          // Pequena micro-pausa para evitar “salto” visual do toast, mas sem prometer timing.
          router.push("/checkout");
        }
      } catch {
        setError("Something went wrong while adding to cart. Please try again.");
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

  const deliveryText = useMemo(() => formatDeliveryRangeISO(getCountryHint()), []);

  /* ---------- UI ---------- */
  return (
    <div className="w-full flex justify-center overflow-x-hidden px-2">
      <div className="relative w-full max-w-[260px] sm:max-w-[520px] lg:max-w-none flex flex-col gap-6 lg:gap-8 lg:flex-row lg:items-start">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {showToast ? "Item added to cart." : ""}
        </div>

        {/* ✅ Fly-to-cart overlay (portal to body) */}
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
                  transition={{
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
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

        {/* ===== GALLERY (conversion upgrade: zoom + click affordance) ===== */}
        <div className="rounded-2xl border bg-white w-full lg:w-[560px] lg:flex-none lg:self-start p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {images.length > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="group hidden lg:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/90 backdrop-blur shadow-md hover:shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronLeft />
              </button>
            ) : (
              <div className="h-10 w-10 shrink-0 hidden lg:block" />
            )}

            <div className="w-full">
              <div
                ref={imgWrapRef}
                className="relative aspect-[3/4] w-full max-w-[240px] sm:max-w-[320px] lg:max-w-none mx-auto overflow-hidden rounded-xl bg-white"
              >
                <button
                  type="button"
                  onClick={() => setShowZoom(true)}
                  aria-label="Zoom image"
                  className="absolute inset-0 z-10 cursor-zoom-in"
                >
                  <span className="sr-only">Zoom</span>
                </button>

                <Image
                  src={activeSrc}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 540px, 100vw"
                  priority
                  unoptimized
                />

                {hasDiscount && (
                  <div className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-full bg-red-500 px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-md flex items-center justify-center">
                    -{discountPercent}%
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] sm:text-xs text-gray-800 border shadow-sm">
                    Tap to zoom
                  </div>
                  <div className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] sm:text-xs text-gray-800 border shadow-sm">
                    {activeIndex + 1}/{images.length}
                  </div>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous image"
                      className="lg:hidden absolute left-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white/90 backdrop-blur shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 z-20"
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next image"
                      className="lg:hidden absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white/90 backdrop-blur shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 z-20"
                    >
                      <ChevronRight />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3">
                  <div
                    ref={thumbsRef}
                    className="mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 [scrollbar-width:none] [-ms-overflow-style:none] no-scrollbar"
                  >
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>
                    <div className="inline-flex gap-2" style={{ scrollBehavior: "smooth" }}>
                      {images.map((src, i) => {
                        const isActive = i === activeIndex;
                        return (
                          <button
                            key={src + i}
                            type="button"
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Image ${i + 1}`}
                            className={cx(
                              "relative flex-none h-[52px] w-[42px] sm:h-[60px] sm:w-[50px] lg:h-[82px] lg:w-[68px] rounded-xl border transition focus:outline-none",
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
                                unoptimized
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="group hidden lg:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/90 backdrop-blur shadow-md hover:shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ChevronRight />
              </button>
            ) : (
              <div className="h-10 w-10 shrink-0 hidden lg:block" />
            )}
          </div>

          {/* trust mini row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <TrustPill icon={<ShieldIcon />} text="Secure checkout" />
            <TrustPill icon={<TruckIcon />} text="Tracked shipping" />
            <TrustPill icon={<RefreshIcon />} text="Easy support" />
          </div>
        </div>

        {/* ===== CONFIGURATOR (conversion upgrade: trust, urgency, sticky CTA, FAQ) ===== */}
        <div className="card w-full p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 flex-1 min-w-0">
          <header className="space-y-2">
            {/* progress bar */}
            <div className="rounded-full bg-gray-100 h-2 overflow-hidden" aria-hidden="true">
              <div className="h-2 bg-blue-600" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base lg:text-2xl font-extrabold tracking-tight leading-snug">
                  {product.name}
                </h1>

                <div className="mt-1 flex items-baseline gap-2">
                  {hasDiscount && originalUnitPriceForMoney && (
                    <span className="text-[11px] sm:text-xs text-gray-400 line-through">
                      {money(originalUnitPriceForMoney)}
                    </span>
                  )}
                  <span className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900">
                    {money(rawUnitPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="ml-1 text-[11px] sm:text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>

                <div className="mt-1 text-[11px] sm:text-xs text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <StarIcon className="h-3.5 w-3.5" />
                    <span className="font-semibold">4.7</span>
                    <span className="text-gray-500">(152 reviews)</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <TruckIcon className="h-3.5 w-3.5" />
                    {deliveryText}
                  </span>
                </div>
              </div>

              {/* small urgency badge */}
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-gray-800 shadow-sm">
                  <BoltIcon className="h-3.5 w-3.5 mr-1" />
                  Bestseller
                </span>
              </div>
            </div>

            {product.description && (
              <p className="mt-1.5 text-xs sm:text-sm text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* inline error (replaces alerts for higher conversion) */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] sm:text-sm text-amber-900"
                  role="status"
                >
                  <span className="font-semibold">Heads up:</span> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Size */}
          <div data-section="size" className="rounded-2xl border p-3 sm:p-4 bg-white/70">
            <div className="flex items-center justify-between gap-2">
              <div className="mb-2 text-[11px] sm:text-sm text-gray-700">
                Size ({kid ? "Kids" : "Adult"}) <span className="text-red-500">*</span>
              </div>

              <button
                type="button"
                onClick={() => setOpenFaq("size")}
                className="text-[11px] sm:text-xs text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                Size guide <InfoIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {sizes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {sizes.map((s) => {
                  const unavailable = isUnavailable(s);
                  const isActive = (selected.size as string) === s.size && !unavailable;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSize(s.size)}
                      disabled={unavailable}
                      aria-disabled={unavailable}
                      title={unavailable ? "Unavailable" : `Select size ${s.size}`}
                      className={cx(
                        "rounded-xl px-2.5 py-1.5 border text-[11px] sm:text-xs lg:text-sm transition",
                        unavailable && "opacity-50 line-through cursor-not-allowed",
                        !unavailable && !isActive && "hover:bg-gray-50",
                        isActive &&
                          !unavailable &&
                          "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                      )}
                      aria-pressed={isActive}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No sizes available.</div>
            )}

            {/* Stock hint */}
            {stockHint && (
              <div
                className={cx(
                  "mt-3 rounded-xl border px-3 py-2 text-[11px] sm:text-xs",
                  stockHint.tone === "danger" && "border-red-200 bg-red-50 text-red-800",
                  stockHint.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
                  stockHint.tone === "info" && "border-blue-200 bg-blue-50 text-blue-900",
                  stockHint.tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-900"
                )}
              >
                {stockHint.text}
              </div>
            )}

            {kid && (
              <p className="mt-2 text-[11px] sm:text-xs text-gray-500">
                Ages are approximate. If in between, we recommend sizing up.
              </p>
            )}
          </div>

          {/* Customization (FREE) */}
          {effectiveCustomizationGroup && effectiveCustomizationGroup.values.length > 0 && (
            <GroupBlock
              group={effectiveCustomizationGroup!}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
              forceFree
            />
          )}

          {/* Personalization */}
          {showNameNumber && (
            <div className="rounded-2xl border p-3 sm:p-4 bg-white/70 space-y-3">
              <div className="text-sm text-gray-700 flex items-center justify-between">
                <span>
                  Personalization{" "}
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    FREE
                  </span>
                </span>
                <span className="text-[11px] sm:text-xs text-gray-500">Optional</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="block">
                  <span className="text-[11px] sm:text-xs text-gray-600">Name (uppercase)</span>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. BELLINGHAM"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value.slice(0, 14))}
                    maxLength={14}
                  />
                  {custName.length > 0 && safeName !== custName.toUpperCase() && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      Will be printed as: <span className="font-semibold">{safeName || "—"}</span>
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="text-[11px] sm:text-xs text-gray-600">Number (0–999)</span>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5"
                    value={custNumber}
                    onChange={(e) => setCustNumber(e.target.value)}
                    inputMode="numeric"
                    maxLength={3}
                  />
                  {custNumber.length > 0 && safeNumber !== custNumber && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      Will be printed as: <span className="font-semibold">{safeNumber || "—"}</span>
                    </span>
                  )}
                </label>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-500">
                Personalization will be printed in the club’s official style.
              </p>
            </div>
          )}

          {/* Badges */}
          {showBadgePicker && badgesGroup && (
            <GroupBlock
              group={badgesGroup!}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
              onToggleBadge={toggleBadge}
              forceFree
            />
          )}

          {/* Other groups */}
          {otherGroups.map((g) => (
            <GroupBlock
              key={g.id}
              group={g}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
            />
          ))}

          {/* Qty + Total */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                disabled={pending}
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-sm">{qty}</span>
              <button
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
                disabled={pending}
              >
                +
              </button>
            </div>

            <div className="text-right sm:text-left">
              <div className="text-xs sm:text-sm text-gray-600">Total</div>
              <div className="text-base sm:text-lg font-semibold">{money(finalPrice)}</div>
            </div>
          </div>

          {/* Primary CTAs (Add + Buy now) */}
          <div className="grid sm:grid-cols-2 gap-2">
            <motion.button
              ref={addBtnRef}
              onClick={addToCart}
              className={cx(
                "btn-primary w-full disabled:opacity-60 inline-flex items-center justify-center gap-2 text-sm sm:text-base",
                justAdded && "bg-green-600 hover:bg-green-600"
              )}
              disabled={pending || !canAddToCart}
              animate={justAdded ? { scale: [1, 1.05, 1] } : {}}
              transition={{ type: "spring", stiffness: 600, damping: 20, duration: 0.4 }}
            >
              {justAdded ? (
                <>
                  <CheckIcon />
                  Added!
                </>
              ) : pending && !buyNow ? (
                "Adding…"
              ) : (
                <>
                  <CartIcon />
                  Add to cart
                </>
              )}
            </motion.button>

            <button
              onClick={onBuyNow}
              className={cx(
                "w-full rounded-xl border border-gray-900 bg-gray-900 text-white px-4 py-2.5 text-sm sm:text-base font-semibold hover:bg-black transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              )}
              disabled={pending || !canAddToCart}
            >
              {pending && buyNow ? "Processing…" : "Buy now"}
            </button>
          </div>

          {/* reassurance row */}
          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="grid sm:grid-cols-3 gap-2 text-[11px] sm:text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <ShieldIcon className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-semibold">Secure payment</div>
                  <div className="text-gray-500">Encrypted checkout</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TruckIcon className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-semibold">Tracked shipping</div>
                  <div className="text-gray-500">{deliveryText}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ChatIcon className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-semibold">Fast support</div>
                  <div className="text-gray-500">We reply quickly</div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ / Objection handling */}
          <div className="rounded-2xl border bg-white/70 overflow-hidden">
            <FaqRow
              open={openFaq === "shipping"}
              onToggle={() => setOpenFaq((v) => (v === "shipping" ? null : "shipping"))}
              title="Shipping & delivery"
              icon={<TruckIcon className="h-4 w-4" />}
            >
              <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm text-gray-700">
                <li>Tracked shipping on all orders.</li>
                <li>{deliveryText} (may vary by region and peak periods).</li>
                <li>We’ll email you the tracking link as soon as it ships.</li>
              </ul>
            </FaqRow>

            <FaqRow
              open={openFaq === "returns"}
              onToggle={() => setOpenFaq((v) => (v === "returns" ? null : "returns"))}
              title="Returns & support"
              icon={<RefreshIcon className="h-4 w-4" />}
            >
              <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm text-gray-700">
                <li>If something arrives wrong/damaged, contact us and we’ll make it right.</li>
                <li>Personalized items may have limited return eligibility.</li>
                <li>Our support team helps fast via email/DM.</li>
              </ul>
            </FaqRow>

            <FaqRow
              open={openFaq === "quality"}
              onToggle={() => setOpenFaq((v) => (v === "quality" ? null : "quality"))}
              title="Quality details"
              icon={<BadgeIcon className="h-4 w-4" />}
            >
              <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm text-gray-700">
                <li>High-quality fabric with breathable feel.</li>
                <li>Badges & prints are applied to match the official style.</li>
                <li>Recommended: wash cold, inside-out.</li>
              </ul>
            </FaqRow>
          </div>
        </div>

        {/* Toast */}
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
              <div className="rounded-xl border bg-white/95 backdrop-blur px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="h-4 w-4 text-green-700" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold">Item added to cart</div>
                  <div className="text-gray-600">You can keep shopping or proceed to checkout.</div>
                </div>
                <button
                  className="ml-2 rounded-lg px-2 py-1 text-xs hover:bg-gray-100"
                  onClick={() => setShowToast(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky CTA (mobile) */}
        <AnimatePresence>
          {isMobile && stickyCta && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur px-3 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
            >
              <div className="mx-auto max-w-[520px] flex items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-600">Total</div>
                  <div className="text-sm font-semibold truncate">{money(finalPrice)}</div>
                </div>

                <button
                  onClick={() => {
                    if (!canAddToCart) {
                      setError(validateBeforeAdd());
                      document.querySelector('[data-section="size"]')?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      return;
                    }
                    addToCart();
                  }}
                  className="ml-auto rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                  disabled={pending}
                >
                  Add
                </button>

                <button
                  onClick={() => {
                    if (!canAddToCart) {
                      setError(validateBeforeAdd());
                      document.querySelector('[data-section="size"]')?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      return;
                    }
                    onBuyNow();
                  }}
                  className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-black transition disabled:opacity-60"
                  disabled={pending}
                >
                  Buy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom modal */}
        {mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {showZoom && (
                <motion.div
                  className="fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowZoom(false)}
                  role="dialog"
                  aria-modal="true"
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, y: 10 }}
                    transition={{ duration: 0.18 }}
                    className="relative w-full max-w-[920px] rounded-2xl bg-white overflow-hidden border shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b">
                      <div className="text-sm font-semibold truncate pr-3">{product.name}</div>
                      <button
                        onClick={() => setShowZoom(false)}
                        className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
                        aria-label="Close"
                      >
                        Close
                      </button>
                    </div>

                    <div className="relative aspect-[3/4] sm:aspect-[16/10] bg-white">
                      <Image
                        src={activeSrc}
                        alt={product.name}
                        fill
                        className="object-contain"
                        sizes="(min-width: 1024px) 920px, 100vw"
                        unoptimized
                      />
                    </div>

                    {images.length > 1 && (
                      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t">
                        <button
                          type="button"
                          onClick={goPrev}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Prev
                        </button>
                        <div className="text-xs text-gray-600">
                          {activeIndex + 1} / {images.length}
                        </div>
                        <button
                          type="button"
                          onClick={goNext}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

        {/* Size guide modal (simple, no external deps) */}
        {mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {openFaq === "size" && (
                <motion.div
                  className="fixed inset-0 z-[9997] bg-black/60 flex items-center justify-center p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpenFaq(null)}
                  role="dialog"
                  aria-modal="true"
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, y: 10 }}
                    transition={{ duration: 0.18 }}
                    className="w-full max-w-[560px] rounded-2xl bg-white border shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="text-sm font-semibold">Size guide</div>
                      <button
                        onClick={() => setOpenFaq(null)}
                        className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
                        aria-label="Close"
                      >
                        Close
                      </button>
                    </div>

                    <div className="p-4 space-y-3 text-sm text-gray-700">
                      <div className="rounded-xl border bg-gray-50 p-3">
                        <div className="font-semibold mb-1">Quick tip</div>
                        <div className="text-gray-600 text-sm">
                          If you’re between sizes, we recommend sizing up for a more comfortable fit.
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border p-3">
                          <div className="font-semibold mb-1">Adult</div>
                          <div className="text-gray-600 text-sm">
                            S, M, L, XL, 2XL, 3XL, 4XL
                          </div>
                        </div>
                        <div className="rounded-xl border p-3">
                          <div className="font-semibold mb-1">Kids</div>
                          <div className="text-gray-600 text-sm">
                            2-3, 3-4, 4-5, 6-7, 8-9, 10-11, 12-13
                          </div>
                        </div>
                      </div>

                      <div className="text-[12px] text-gray-500">
                        Note: measurements can vary slightly depending on the model/manufacturer.
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t">
                      <button
                        className="w-full rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition"
                        onClick={() => setOpenFaq(null)}
                      >
                        Got it
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>
    </div>
  );
}

/* ====================== Group Subcomponent ====================== */
function GroupBlock({
  group,
  selected,
  onPickRadio,
  onToggleAddon,
  onToggleBadge,
  forceFree,
}: {
  group: OptionGroupUI;
  selected: SelectedState;
  onPickRadio: (key: string, value: string) => void;
  onToggleAddon: (key: string, value: string, checked: boolean) => void;
  onToggleBadge?: (group: OptionGroupUI, value: string, checked: boolean) => void;
  forceFree?: boolean;
}) {
  if (group.type === "SIZE") return null;

  if (group.type === "RADIO") {
    return (
      <div className="rounded-2xl border p-3 sm:p-4 bg-white/70">
        <div className="mb-2 text-[11px] sm:text-sm text-gray-700">
          {group.label} {group.required && <span className="text-red-500">*</span>}
        </div>
        <div className="grid gap-2">
          {group.values.map((v) => {
            const active = selected[group.key] === v.value;
            return (
              <label
                key={v.id}
                className={cx(
                  "flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition",
                  active ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={group.key}
                    className="accent-blue-600"
                    checked={!!active}
                    onChange={() => onPickRadio(group.key, v.value)}
                  />
                  <span className="text-sm">{v.label}</span>
                </div>
                {forceFree ? (
                  <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    FREE
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  const chosen = selected[group.key];
  const isActive = (value: string) =>
    Array.isArray(chosen) ? chosen.includes(value) : chosen === value;

  return (
    <div className="rounded-2xl border p-3 sm:p-4 bg-white/70">
      <div className="mb-2 text-[11px] sm:text-sm text-gray-700">
        {group.label} {group.required && <span className="text-red-500">*</span>}
      </div>
      <div className="grid gap-2">
        {group.values.map((v) => {
          const active = isActive(v.value);
          return (
            <label
              key={v.id}
              className={cx(
                "flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition",
                active ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={!!active}
                  onChange={(e) =>
                    group.key === "badges" && onToggleBadge
                      ? onToggleBadge(group, v.value, e.target.checked)
                      : onToggleAddon(group.key, v.value, e.target.checked)
                  }
                />
                <span className="text-sm">{v.label}</span>
              </div>
              {forceFree ? (
                <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                  FREE
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ====================== FAQ Row ====================== */
function FaqRow({
  open,
  onToggle,
  title,
  icon,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-800">{icon}</span>
          <span className="font-semibold text-sm text-gray-900 truncate">{title}</span>
        </div>
        <span className={cx("text-gray-500 transition-transform", open && "rotate-180")}>
          <ChevronDownIcon />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====================== Trust pill ====================== */
function TrustPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-xl border bg-gray-50 px-2.5 py-2 text-[11px] sm:text-xs text-gray-700 flex items-center justify-center gap-2">
      <span className="text-gray-800">{icon}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

/* ====================== Icons ====================== */
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} className={cx("h-5 w-5", props.className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("mx-auto h-5 w-5 text-gray-900 group-hover:scale-110 transition-transform", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={cx("mx-auto h-5 w-5 text-gray-900 group-hover:scale-110 transition-transform", props.className)}
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("h-5 w-5", props.className)} fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 17.3l-5.4 3 1-6.1-4.4-4.3 6.1-.9L12 3.5l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-3z"
        stroke="currentColor"
        strokeWidth={1.8}
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
      <path d="M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor" />
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
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 10-2.3 5.7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path d="M20 8v4h-4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M6 7l-1-3H2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
      />
    </svg>
  );
}
function BoltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M13 2L3 14h7l-1 8 12-14h-7l-1-6z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-blue-700", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 110-20 10 10 0 010 20z"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <path d="M12 10v7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
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
      <path d="M8 9h8M8 12h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
function BadgeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-gray-800", props.className)} fill="none" aria-hidden="true">
      <path
        d="M12 2l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}