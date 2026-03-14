"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { addToCartAction } from "@/app/[locale]/(store)/cart/actions";
import { money } from "@/lib/money";
import { AnimatePresence, motion } from "framer-motion";

/* ====================== MAPA DE DESCONTOS ====================== */
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
type TFn = (key: string, values?: Record<string, string | number>) => string;

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
const KID_SIZES = ["2-3", "3-4", "4-5", "6-7", "8-9", "10-11", "12-13"] as const;
const isKidProduct = (name: string) => /kid/i.test(name);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ====================== Translation helpers ====================== */
function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function translateGroupLabel(group: OptionGroupUI, t: TFn) {
  const byKey = normalizeKey(group.key);
  const byLabel = normalizeKey(group.label);

  const mappedByKey: Record<string, string> = {
    customization: t("customization"),
    badges: t("badges"),
    size: t("size"),
  };

  const mappedByLabel: Record<string, string> = {
    customization: t("customization"),
    badges: t("badges"),
    size: t("size"),
  };

  return mappedByKey[byKey] ?? mappedByLabel[byLabel] ?? group.label;
}

function translateOptionLabel(group: OptionGroupUI, option: OptionValueUI, t: TFn) {
  const rawValue = normalizeKey(option.value);
  const rawLabel = normalizeKey(option.label);

  if (group.key === "customization") {
    const map: Record<string, string> = {
      "no-customization": t("optionNoCustomization"),
      "without-customization": t("optionNoCustomization"),
      none: t("optionNoCustomization"),

      "name-number": t("optionNameNumber"),
      "name-and-number": t("optionNameNumber"),

      badge: t("optionCompetitionBadge"),
      "competition-badge": t("optionCompetitionBadge"),

      "name-number-badge": t("optionNameNumberCompetitionBadge"),
      "name-and-number-badge": t("optionNameNumberCompetitionBadge"),
      "name-number-competition-badge": t("optionNameNumberCompetitionBadge"),
      "name-and-number-competition-badge": t("optionNameNumberCompetitionBadge"),
    };

    return map[rawValue] ?? map[rawLabel] ?? option.label;
  }

  return option.label;
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
  const m = value.match(/^[A-Za-z]+/) || [value];
  return take(m[0]);
}

/* ====================== Fly types ====================== */
type FlyRect = { left: number; top: number; width: number; height: number };
type FlyState = { key: number; src: string; from: FlyRect; to: FlyRect };

/* ====================== Unicode helpers ====================== */
function sanitizeNameUnicode(input: string, maxLen = 14) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^\p{L} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}
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

/* ====================== Reviews meta fetch ====================== */
type ReviewsMeta = { average: number; total: number };

async function fetchReviewsMeta(productId: string): Promise<ReviewsMeta> {
  const res = await fetch(`/api/reviews?productId=${productId}`, { cache: "no-store" });
  const json = (await res.json()) as { average?: number; total?: number };
  return { average: Number(json?.average ?? 0), total: Number(json?.total ?? 0) };
}

/* ====================== Size guide data ====================== */
type Unit = "cm" | "in";
type Range = [number, number] | number;
type AdultRowKey = "Length" | "Width" | "Height" | "Weight";
type AdultSizeKey = "S" | "M" | "L" | "XL" | "2XL";
type AdultRows = Record<AdultRowKey, Partial<Record<AdultSizeKey, Range>>>;
type AdultTable = { sizes: AdultSizeKey[]; rows: AdultRows };

const ADULT: AdultTable = {
  sizes: ["S", "M", "L", "XL", "2XL"],
  rows: {
    Length: { S: [69, 71], M: [71, 73], L: [73, 75], XL: [75, 78], "2XL": [78, 81] },
    Width: { S: [53, 55], M: [55, 57], L: [57, 58], XL: [58, 60], "2XL": [60, 62] },
    Height: { S: [162, 170], M: [170, 176], L: [176, 182], XL: [182, 190], "2XL": [190, 195] },
    Weight: { S: [50, 62], M: [62, 78], L: [78, 83], XL: [83, 90], "2XL": [90, 97] },
  },
};

type KidsRow = {
  size: string;
  length: number;
  bust: number;
  height: [number, number];
  age: string;
  shortsLength: number;
};

const KIDS_ROWS: KidsRow[] = [
  { size: "#16", length: 43, bust: 32, height: [95, 105], age: "2–3", shortsLength: 32 },
  { size: "#18", length: 47, bust: 34, height: [105, 115], age: "3–4", shortsLength: 34 },
  { size: "#20", length: 50, bust: 36, height: [115, 125], age: "4–5", shortsLength: 36 },
  { size: "#22", length: 53, bust: 38, height: [125, 135], age: "6–7", shortsLength: 38 },
  { size: "#24", length: 56, bust: 40, height: [135, 145], age: "8–9", shortsLength: 39 },
  { size: "#26", length: 58, bust: 42, height: [145, 155], age: "10–11", shortsLength: 40 },
  { size: "#28", length: 61, bust: 44, height: [155, 165], age: "12–13", shortsLength: 43 },
];

function toInches(v: number) {
  return +(v / 2.54).toFixed(1);
}

function renderRange(value: Range | undefined, unit: Unit) {
  if (value === undefined) return "–";
  if (Array.isArray(value)) {
    const [a, b] = value;
    return unit === "cm" ? `${a}–${b} cm` : `${toInches(a)}–${toInches(b)} in`;
  }
  return unit === "cm" ? `${value} cm` : `${toInches(value)} in`;
}

type KidsRowKey = "Jersey length" | "Chest (bust)" | "Height" | "Shorts length";
type KidsTableShape = { sizes: string[]; rows: Record<KidsRowKey, Partial<Record<string, Range>>> };

function makeKidsTable(): KidsTableShape {
  const sizes = KIDS_ROWS.map((r) => `${r.age} yrs`);
  const rows: KidsTableShape["rows"] = {
    "Jersey length": {},
    "Chest (bust)": {},
    Height: {},
    "Shorts length": {},
  };

  KIDS_ROWS.forEach((r) => {
    const key = `${r.age} yrs`;
    rows["Jersey length"][key] = r.length;
    rows["Chest (bust)"][key] = r.bust;
    rows["Height"][key] = [r.height[0], r.height[1]];
    rows["Shorts length"][key] = r.shortsLength;
  });

  return { sizes, rows };
}

export default function ProductConfigurator({ product }: Props) {
  const t = useTranslations("ProductConfigurator");
  const router = useRouter();

  const DELIVERY_TEXT = t("deliveryText");

  const [selected, setSelected] = useState<SelectedState>({});
  const [custName, setCustName] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [qty, setQty] = useState(1);

  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [fly, setFly] = useState<FlyState | null>(null);
  const flyKeyRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [openSizeGuide, setOpenSizeGuide] = useState(false);

  const [stickyCta, setStickyCta] = useState(false);
  const [buyNow, setBuyNow] = useState(false);

  const [reviewsMeta, setReviewsMeta] = useState<ReviewsMeta>({ average: 0, total: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const isMobile = useIsMobile(1024);
  useLockBodyScroll(openSizeGuide);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);

    fetchReviewsMeta(product.id)
      .then((m) => {
        if (!alive) return;
        setReviewsMeta(m);
      })
      .finally(() => {
        if (!alive) return;
        setReviewsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [product.id]);

  const rawUnitPrice = product.basePrice;
  const candidateEur1 = rawUnitPrice;
  const candidateEur2 = rawUnitPrice / 100;

  let salePriceEur: number;
  if (SALE_MAP_EUR[candidateEur1.toFixed(2)]) salePriceEur = candidateEur1;
  else if (SALE_MAP_EUR[candidateEur2.toFixed(2)]) salePriceEur = candidateEur2;
  else salePriceEur = rawUnitPrice > 100 ? candidateEur2 : candidateEur1;

  const saleKey = salePriceEur.toFixed(2);
  const originalPriceEur = SALE_MAP_EUR[saleKey];

  let originalUnitPriceForMoney: number | undefined;
  if (typeof originalPriceEur === "number") {
    const factor = rawUnitPrice / salePriceEur;
    originalUnitPriceForMoney = originalPriceEur * factor;
  }

  const hasDiscount =
    typeof originalPriceEur === "number" && originalPriceEur > salePriceEur;
  const discountPercent = hasDiscount
    ? Math.round(((originalPriceEur - salePriceEur) / originalPriceEur) * 100)
    : 0;

  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const activeSrc = images[Math.min(activeIndex, images.length - 1)];
  const imgWrapRef = useRef<HTMLDivElement | null>(null);

  const THUMB_W = 68;
  const GAP = 8;
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cont = thumbsRef.current;
    if (!cont) return;

    const itemWidth = THUMB_W + GAP;
    const maxScroll = cont.scrollWidth - cont.clientWidth;

    const nearEnd = activeIndex >= images.length - 2;
    const nearStart = activeIndex <= 1;

    let desired = Math.max(0, (activeIndex - 2) * itemWidth);
    if (nearEnd) desired = maxScroll;
    if (nearStart) desired = 0;

    desired = Math.min(desired, Math.max(0, maxScroll));
    cont.scrollTo({ left: desired, behavior: "smooth" });
  }, [activeIndex, images.length]);

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

    return (kid ? KID_SIZES : ADULT_SIZES).map((s) => ({
      id: s,
      size: s,
      stock: 999,
      available: true,
    }));
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

  const stockHint = useMemo(() => {
    const sel = selectedSize ? sizes.find((s) => s.size === selectedSize) : null;
    const stock = sel?.stock;
    if (!sel) return null;
    if (isUnavailable(sel)) return { tone: "danger" as const, text: t("stockSoldOut") };
    if (typeof stock === "number") {
      if (stock <= 3) return { tone: "warning" as const, text: t("stockOnlyLeft", { count: stock }) };
      if (stock <= 8) return { tone: "info" as const, text: t("stockLow") };
    }
    return { tone: "ok" as const, text: t("stockReady") };
  }, [selectedSize, sizes, t]);

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
      label: t("badges"),
      type: "ADDON",
      required: false,
      values,
    };
  }, [product.badges, t]);

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

  const unitJerseyPrice = useMemo(() => product.basePrice, [product.basePrice]);
  const finalPrice = useMemo(() => unitJerseyPrice * qty, [unitJerseyPrice, qty]);

  const safeName = useMemo(() => sanitizeNameUnicode(custName, 14), [custName]);
  const safeNumber = useMemo(() => sanitizeNumber(custNumber, 3), [custNumber]);

  const requiredGroups = useMemo(() => {
    const groups: OptionGroupUI[] = [];
    if (effectiveCustomizationGroup) groups.push(effectiveCustomizationGroup);
    if (showBadgePicker && badgesGroup) groups.push(badgesGroup);
    for (const g of otherGroups) groups.push(g);
    return groups.filter((g) => g.required);
  }, [effectiveCustomizationGroup, showBadgePicker, badgesGroup, otherGroups]);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];

    for (const g of requiredGroups) {
      const v = selected[g.key];
      const translatedLabel = translateGroupLabel(g, t);

      if (g.type === "RADIO") {
        if (!v || typeof v !== "string") missing.push(translatedLabel);
      } else {
        const arr = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
        if (arr.length === 0) missing.push(translatedLabel);
      }
    }

    return missing;
  }, [requiredGroups, selected, t]);

  const canAddToCart = useMemo(() => {
    if (!selectedSize) return false;
    if (qty < 1) return false;
    if (missingRequired.length > 0) return false;
    return true;
  }, [selectedSize, qty, missingRequired]);

  const progress = useMemo(() => {
    const step1 = !!selectedSize ? 1 : 0;
    const step2 = missingRequired.length === 0 ? 1 : 0;
    const step3 = canAddToCart ? 1 : 0;
    return clamp(Math.round(((step1 + step2 + step3) / 3) * 100), 0, 100);
  }, [selectedSize, missingRequired.length, canAddToCart]);

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

  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

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
      const shouldShow = r.top > window.innerHeight - 20 || r.bottom < 0;
      setStickyCta(shouldShow);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  function buildOptionsForCart() {
    return Object.fromEntries(
      Object.entries(selected).map(([k, v]) => [
        k,
        Array.isArray(v) ? (v.length ? v.join(",") : null) : v ?? null,
      ])
    ) as Record<string, string | null>;
  }

  function validateBeforeAdd(): string | null {
    if (!selectedSize) return t("validationChooseSize");

    const sel = sizes.find((s) => s.size === selectedSize);
    if (!sel || isUnavailable(sel)) return t("validationSizeUnavailable");

    if (qty < 1) return t("validationQuantity");

    if (missingRequired.length > 0) {
      return t("validationSelect", { fields: missingRequired.join(", ") });
    }

    return null;
  }

  function addToCartCore(opts?: { goCheckout?: boolean }) {
    const msg = validateBeforeAdd();

    if (msg && !canAddToCart) {
      setError(msg);

      if (!selectedSize) {
        document
          .querySelector('[data-section="size"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
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

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cart-updated"));
        }

        router.refresh();

        setJustAdded(true);
        setShowToast(true);
        setError(null);

        flyToCart();

        window.setTimeout(() => setShowToast(false), 2200);
        window.setTimeout(() => setJustAdded(false), 900);

        if (opts?.goCheckout) router.push("/checkout");
      } catch {
        setError(t("addToCartError"));
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

  return (
    <div className="w-full overflow-x-hidden px-2">
      <div className="relative mx-auto flex w-full max-w-[260px] flex-col gap-6 sm:max-w-[520px] lg:max-w-none lg:flex-row lg:items-start lg:gap-8">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {showToast ? t("itemAddedLive") : ""}
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
            {images.length > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                aria-label={t("previousImage")}
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
                alt={product.name}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 540px, 100vw"
                priority
                unoptimized
              />

              {hasDiscount && (
                <div className="absolute left-3 top-3 flex items-center justify-center rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-md sm:left-4 sm:top-4 sm:text-sm">
                  -{discountPercent}%
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label={t("previousImage")}
                    className="absolute left-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-md backdrop-blur transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label={t("nextImage")}
                    className="absolute right-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-md backdrop-blur transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 ? (
              <button
                type="button"
                onClick={goNext}
                aria-label={t("nextImage")}
                className="group hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/90 shadow-md backdrop-blur transition-all hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 lg:inline-flex"
              >
                <ChevronRight />
              </button>
            ) : (
              <div className="hidden h-10 w-10 shrink-0 lg:block" />
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3">
              <div
                ref={thumbsRef}
                className="no-scrollbar mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 pr-6 [scrollbar-width:none] [-ms-overflow-style:none]"
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
                        aria-label={t("imageNumber", { number: i + 1 })}
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

          <div className="mt-4 grid grid-cols-3 gap-2">
            <TrustPill icon={<ShieldIcon />} text={t("trustSecureCheckout")} />
            <TrustPill icon={<TruckIcon />} text={t("trustTrackedShipping")} />
            <TrustPill icon={<ChatIcon />} text={t("trustFastSupport")} />
          </div>
        </div>

        <div className="card min-w-0 w-full flex-1 space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
          <header className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div className="h-2 bg-blue-600" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold leading-snug tracking-tight sm:text-base lg:text-2xl">
                  {product.name}
                </h1>

                <div className="mt-1 flex items-baseline gap-2">
                  {hasDiscount && originalUnitPriceForMoney && (
                    <span className="text-[11px] text-gray-400 line-through sm:text-xs">
                      {money(originalUnitPriceForMoney)}
                    </span>
                  )}

                  <span className="text-sm font-semibold text-gray-900 sm:text-lg lg:text-xl">
                    {money(rawUnitPrice)}
                  </span>

                  {hasDiscount && (
                    <span className="ml-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 sm:text-xs">
                      {t("savePercent", { percent: discountPercent })}
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
                      {t("noReviewsYet")}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-2">
                    <TruckIcon className="h-3.5 w-3.5" />
                    {DELIVERY_TEXT}
                  </span>
                </div>
              </div>
            </div>

            {product.description && (
              <p className="mt-1.5 whitespace-pre-line text-xs text-gray-700 sm:text-sm">
                {product.description}
              </p>
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
                  <span className="font-semibold">{t("headsUp")}</span> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          <div data-section="size" className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
                {t("size")} ({kid ? t("kids") : t("adult")}){" "}
                <span className="text-red-500">*</span>
              </div>

              <button
                type="button"
                onClick={() => setOpenSizeGuide(true)}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline sm:text-xs"
              >
                {t("sizeGuide")} <InfoIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {sizes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {sizes.map((s) => {
                  const unavailable = isUnavailable(s);
                  const isActive = selected.size === s.size && !unavailable;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSize(s.size)}
                      disabled={unavailable}
                      aria-disabled={unavailable}
                      title={unavailable ? t("unavailable") : t("selectSize", { size: s.size })}
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
              <div className="text-sm text-gray-500">{t("noSizesAvailable")}</div>
            )}

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
              <p className="mt-2 text-[11px] text-gray-500 sm:text-xs">{t("kidsSizeNote")}</p>
            )}
          </div>

          {effectiveCustomizationGroup && effectiveCustomizationGroup.values.length > 0 && (
            <GroupBlock
              group={effectiveCustomizationGroup}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
              forceFree
            />
          )}

          {showNameNumber && (
            <div className="space-y-3 rounded-2xl border bg-white/70 p-3 sm:p-4">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>
                  {t("personalization")}{" "}
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    {t("free")}
                  </span>
                </span>
                <span className="text-[11px] text-gray-500 sm:text-xs">{t("optional")}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <label className="block">
                  <span className="text-[11px] text-gray-600 sm:text-xs">{t("nameUppercase")}</span>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("namePlaceholder")}
                    value={custName}
                    onChange={(e) => setCustName(e.target.value.slice(0, 14))}
                    maxLength={14}
                  />
                  {custName.length > 0 && safeName !== custName.toUpperCase() && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      {t("willBePrintedAs")}{" "}
                      <span className="font-semibold">{safeName || "—"}</span>
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="text-[11px] text-gray-600 sm:text-xs">{t("numberLabel")}</span>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("numberPlaceholder")}
                    value={custNumber}
                    onChange={(e) => setCustNumber(e.target.value)}
                    inputMode="numeric"
                    maxLength={3}
                  />
                  {custNumber.length > 0 && safeNumber !== custNumber && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      {t("willBePrintedAs")}{" "}
                      <span className="font-semibold">{safeNumber || "—"}</span>
                    </span>
                  )}
                </label>
              </div>

              <p className="text-[11px] text-gray-500 sm:text-xs">{t("personalizationNote")}</p>
            </div>
          )}

          {showBadgePicker && badgesGroup && (
            <GroupBlock
              group={badgesGroup}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
              onToggleBadge={toggleBadge}
              forceFree
            />
          )}

          {otherGroups.map((g) => (
            <GroupBlock
              key={g.id}
              group={g}
              selected={selected}
              onPickRadio={setRadio}
              onToggleAddon={toggleAddon}
            />
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={t("decreaseQuantity")}
                disabled={pending}
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-sm">{qty}</span>
              <button
                type="button"
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setQty((q) => q + 1)}
                aria-label={t("increaseQuantity")}
                disabled={pending}
              >
                +
              </button>
            </div>

            <div className="text-right sm:text-left">
              <div className="text-xs text-gray-600 sm:text-sm">{t("total")}</div>
              <div className="text-base font-semibold sm:text-lg">{money(finalPrice)}</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <motion.button
              ref={addBtnRef}
              onClick={addToCart}
              className={cx(
                "btn-primary inline-flex w-full items-center justify-center gap-2 text-sm sm:text-base",
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
                  {t("added")}
                </>
              ) : pending && !buyNow ? (
                t("adding")
              ) : (
                <>
                  <CartIcon />
                  {t("addToCart")}
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={onBuyNow}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 sm:text-base"
              disabled={pending || !canAddToCart}
            >
              {pending && buyNow ? t("processing") : t("buyNow")}
            </button>
          </div>

          <InfoAccordions />

          <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
            <div className="grid gap-2 text-[11px] text-gray-700 sm:grid-cols-3 sm:text-xs">
              <div className="flex items-start gap-2">
                <ShieldIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">{t("securePayment")}</div>
                  <div className="text-gray-500">{t("encryptedCheckout")}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <TruckIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">{t("trackedShipping")}</div>
                  <div className="text-gray-500">{DELIVERY_TEXT}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ChatIcon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-semibold">{t("fastSupport")}</div>
                  <div className="text-gray-500">{t("weReplyQuickly")}</div>
                </div>
              </div>
            </div>
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
                  <div className="font-semibold">{t("toastTitle")}</div>
                  <div className="text-gray-600">{t("toastSubtitle")}</div>
                </div>
                <button
                  type="button"
                  className="ml-2 rounded-lg px-2 py-1 text-xs hover:bg-gray-100"
                  onClick={() => setShowToast(false)}
                >
                  {t("close")}
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
                  <div className="text-[11px] text-gray-600">{t("total")}</div>
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
                  {t("addShort")}
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
                  {t("buyShort")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {openSizeGuide && (
                <SizeGuideModal
                  onClose={() => setOpenSizeGuide(false)}
                  defaultTab={kid ? "kids" : "adult"}
                />
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>
    </div>
  );
}

function InfoAccordions() {
  const t = useTranslations("ProductConfigurator");

  return (
    <div className="overflow-hidden rounded-2xl border bg-white/70">
      <AccordionRow icon={<TruckIcon className="h-4 w-4" />} title={t("shippingDelivery")} defaultOpen>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              <b>{t("estimatedDeliveryBold")}</b> {t("estimatedDeliveryText")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("trackingNumberText1")} <b>{t("trackingNumberBold")}</b>{" "}
              {t("trackingNumberText2")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("supportRepliesFast")}</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<RotateIcon className="h-4 w-4" />} title={t("returnsSupport")}>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("gotProblem")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("keepProductText1")} <b>{t("unusedBold")}</b> {t("keepProductText2")}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("personalizedItemsRule")}</span>
          </li>
        </ul>
      </AccordionRow>

      <Divider />

      <AccordionRow icon={<StarBadgeIcon className="h-4 w-4" />} title={t("qualityDetails")}>
        <ul className="space-y-2 text-xs text-gray-700 sm:text-sm">
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("qualityStitching")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>{t("qualityComfort")}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1">•</span>
            <span>
              {t("bestFitText1")} <b>{t("sizeGuideBold")}</b> {t("bestFitText2")}
            </span>
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
  const t = useTranslations("ProductConfigurator");

  if (group.type === "SIZE") return null;

  if (group.type === "RADIO") {
    return (
      <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
        <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
          {translateGroupLabel(group, t)} {group.required && <span className="text-red-500">*</span>}
        </div>

        <div className="grid gap-2">
          {group.values.map((v) => {
            const active = selected[group.key] === v.value;

            return (
              <label
                key={v.id}
                className={cx(
                  "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition",
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
                  <span className="text-sm">{translateOptionLabel(group, v, t)}</span>
                </div>

                {forceFree ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    {t("free")}
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
    <div className="rounded-2xl border bg-white/70 p-3 sm:p-4">
      <div className="mb-2 text-[11px] text-gray-700 sm:text-sm">
        {translateGroupLabel(group, t)} {group.required && <span className="text-red-500">*</span>}
      </div>

      <div className="grid gap-2">
        {group.values.map((v) => {
          const active = isActive(v.value);

          return (
            <label
              key={v.id}
              className={cx(
                "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition",
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
                <span className="text-sm">{translateOptionLabel(group, v, t)}</span>
              </div>

              {forceFree ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                  {t("free")}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SizeGuideModal({
  onClose,
  defaultTab,
}: {
  onClose: () => void;
  defaultTab: "adult" | "kids";
}) {
  const t = useTranslations("ProductConfigurator");
  const [tab, setTab] = useState<"adult" | "kids">(defaultTab);
  const [unit, setUnit] = useState<Unit>("cm");
  const kids = useMemo(() => makeKidsTable(), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{t("sizeGuide")}</div>
            <div className="text-[11px] text-gray-500">{t("sizeGuideSwitchText")}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
            aria-label={t("close")}
          >
            {t("close")}
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm">
              <button
                className={cx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                  tab === "adult" ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setTab("adult")}
                type="button"
              >
                {t("adult")}
              </button>
              <button
                className={cx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                  tab === "kids" ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setTab("kids")}
                type="button"
              >
                {t("kids")}
              </button>
            </div>

            <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm">
              <button
                className={cx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                  unit === "cm" ? "bg-gray-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setUnit("cm")}
                type="button"
              >
                cm
              </button>
              <button
                className={cx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                  unit === "in" ? "bg-gray-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => setUnit("in")}
                type="button"
              >
                {t("inches")}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-3 py-2 text-xs sm:px-4 sm:text-sm">
              {t("units")}: <b>{unit === "cm" ? t("centimetres") : t("inchesFull")}</b>
            </div>

            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <div className={cx("px-4 sm:px-0", tab === "adult" ? "min-w-[620px]" : "min-w-[680px]")}>
                {tab === "adult" ? (
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <colgroup>
                      <col className="w-32 sm:w-40" />
                      {ADULT.sizes.map((_, i) => (
                        <col key={i} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-center font-medium sm:px-4 sm:py-3">
                          {t("measurement")}
                        </th>
                        {ADULT.sizes.map((s) => (
                          <th
                            key={s}
                            className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium sm:px-4 sm:py-3"
                          >
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(["Length", "Width", "Height", "Weight"] as AdultRowKey[]).map((key, i) => (
                        <tr key={key} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold sm:px-4 sm:py-3">
                            {t(`adultRow.${key}` as any)}
                          </td>
                          {ADULT.sizes.map((s) => (
                            <td
                              key={s}
                              className="whitespace-nowrap border border-gray-300 px-3 py-2 text-center sm:px-4 sm:py-3"
                            >
                              {renderRange(ADULT.rows[key][s], unit)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <colgroup>
                      <col className="w-32 sm:w-40" />
                      {kids.sizes.map((_, i) => (
                        <col key={i} />
                      ))}
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-center font-medium sm:px-4 sm:py-3">
                          {t("measurement")}
                        </th>
                        {kids.sizes.map((s) => (
                          <th
                            key={s}
                            className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium sm:px-4 sm:py-3"
                          >
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        ["Jersey length", "Chest (bust)", "Height", "Shorts length"] as KidsRowKey[]
                      ).map((rowKey, idx) => (
                        <tr key={rowKey} className={idx % 2 ? "bg-white" : "bg-gray-50/40"}>
                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold sm:px-4 sm:py-3">
                            {t(`kidsRow.${rowKey}` as any)}
                          </td>
                          {kids.sizes.map((s) => (
                            <td
                              key={s}
                              className="whitespace-nowrap border border-gray-300 px-3 py-2 text-center sm:px-4 sm:py-3"
                            >
                              {renderRange(kids.rows[rowKey][s], unit)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="text-[12px] text-gray-500">{t("sizeGuideTip")}</div>
        </div>

        <div className="border-t px-4 py-3">
          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            onClick={onClose}
            type="button"
          >
            {t("gotIt")}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={cx("text-blue-700", props.className)} fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 110-20 10 10 0 010 20z" stroke="currentColor" strokeWidth={1.8} />
      <path d="M12 10v7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
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
