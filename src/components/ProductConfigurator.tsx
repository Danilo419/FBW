// src/components/ProductConfigurator.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addToCartAction } from "@/app/(store)/cart/actions";
import { money } from "@/lib/money";
import { AnimatePresence, motion } from "framer-motion";

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
  /** ✅ novo: badges guardados no produto (array de valores/keys) */
  badges?: string[];
};

type SelectedState = Record<string, string | string[] | null>;
type Props = { product: ProductUI };

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
const KID_SIZES = ["2-3", "3-4", "4-5", "6-7", "8-9", "10-11", "12-13"] as const;
const isKidProduct = (name: string) => /kid/i.test(name);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ============ Catálogo (label) para valores de badge conhecidos ============ */
const BADGE_LABELS: Record<string, string> = {
  // Ligas
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
  // Outras ligas
  "mls-regular": "MLS – League Badge",
  "mls-champions": "MLS – Champions (MLS Cup Holders)",
  "brasileirao-regular": "Brasileirão – League Badge",
  "brasileirao-champions": "Brasileirão – Champion",
  "super-lig-regular": "Süper Lig – League Badge",
  "super-lig-champions": "Süper Lig – Champion",
  "spl-saudi-regular": "Saudi Pro League – League Badge",
  "spl-saudi-champions": "Saudi Pro League – Champion",
  // UEFA
  "ucl-regular": "UEFA Champions League – Starball Badge",
  "ucl-winners": "UEFA Champions League – Winners Badge",
  "uel-regular": "UEFA Europa League – Badge",
  "uel-winners": "UEFA Europa League – Winners Badge",
  "uecl-regular": "UEFA Europa Conference League – Badge",
  "uecl-winners": "UEFA Europa Conference League – Winners Badge",
  // Mundial de Clubes
  "club-world-cup-champions": "FIFA Club World Cup – Champions Badge",
};

/** Humaniza um valor desconhecido para mostrar algo decente ao utilizador */
function humanizeBadge(value: string) {
  if (BADGE_LABELS[value]) return BADGE_LABELS[value];
  // fallback: "ucl-regular" -> "Ucl Regular"
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ========= Helper para badges ========= */
function competitionKey(value: string, label?: string) {
  const take = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();
  if (value.includes("_")) return take(value.split("_")[0]);
  const source = label || value;
  const parts = source.split(/–|—|-/);
  if (parts.length > 1) return take(parts[0]);
  const m = (value.match(/^[A-Za-z]+/) || [value])[0];
  return take(m);
}

export default function ProductConfigurator({ product }: Props) {
  const [selected, setSelected] = useState<SelectedState>({});
  const [custName, setCustName] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [qty, setQty] = useState(1);

  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  /* ---------- Images ---------- */
  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const activeSrc = images[Math.min(activeIndex, images.length - 1)];
  const imgWrapRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Thumbs ---------- */
  const MAX_VISIBLE_THUMBS = 6;
  const THUMB_W = 68;
  const GAP = 8;
  const STRIP_MAX_W = MAX_VISIBLE_THUMBS * THUMB_W + (MAX_VISIBLE_THUMBS - 1) * GAP;
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
  };

  useEffect(() => {
    if (!selectedSize) return;
    const found = sizes.find((s) => s.size === selectedSize);
    if (!found || isUnavailable(found)) {
      setSelectedSize(null);
      setSelected((st) => ({ ...st, size: null }));
    }
  }, [sizes, selectedSize]);

  /* ---------- Groups ---------- */
  const customizationGroupFromDb = product.optionGroups.find((g) => g.key === "customization");

  /** ✅ Grupo virtual de badges construído a partir de `product.badges` */
  const badgesGroupVirtual: OptionGroupUI | undefined = useMemo(() => {
    if (!product.badges || product.badges.length === 0) return undefined;
    const values: OptionValueUI[] = product.badges.map((v) => ({
      id: v,
      value: v,
      label: humanizeBadge(v),
      priceDelta: 0, // grátis
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

  /**
   * ✅ Merge do grupo real "badges" (BD) com o virtual (product.badges)
   * - Mantém a ordem do real e adiciona valores que existam só no virtual.
   * - Evita duplicados por `value`.
   */
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

  // ✅ Só mostramos a secção customization se existir na BD e tiver valores (após filtros).
  const effectiveCustomizationGroup: OptionGroupUI | undefined = useMemo(() => {
    if (!customizationGroupFromDb) return undefined;

    const original = customizationGroupFromDb;
    const filtered = badgesGroup
      ? original.values
      : original.values.filter((v) => !/badge/i.test(v.value) && !/badge/i.test(v.label));

    if ((filtered?.length ?? 0) === 0) return undefined;
    return { ...original, values: filtered };
  }, [customizationGroupFromDb, badgesGroup]);

  // Outros grupos (shorts, socks, etc. — fora size/customization/badges)
  const otherGroups = product.optionGroups.filter(
    (g) => !["size", "customization", "badges", "shorts", "socks"].includes(g.key)
  );

  const customization = selected["customization"] ?? "";

  // Se a secção customization for escondida, limpa seleção relacionada
  useEffect(() => {
    if (!effectiveCustomizationGroup && customization) {
      setSelected((s) => ({ ...s, customization: null }));
    }
  }, [effectiveCustomizationGroup, customization]);

  // se não houver badges e a seleção tiver "badge", limpar
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

  const setRadio = (key: string, value: string) =>
    setSelected((s) => ({ ...s, [key]: value || null }));

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
        // Garante exclusividade por competição (ex.: só 1 UCL)
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
  }

  /* ---------- Price ---------- */
  const unitJerseyPrice = useMemo(() => product.basePrice, [product.basePrice]);
  const finalPrice = useMemo(() => unitJerseyPrice * qty, [unitJerseyPrice, qty]);

  /* ---------- Sanitize ---------- */
  const safeName = useMemo(
    () => custName.toUpperCase().replace(/[^A-Z .'-]/g, "").slice(0, 14),
    [custName]
  );
  const safeNumber = useMemo(() => custNumber.replace(/\D/g, "").slice(0, 2), [custNumber]);

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
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(cx - imgCx, cy - imgCy);
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
    if (typeof document === "undefined") return;
    const start = imgWrapRef.current?.getBoundingClientRect();
    const end = getCartTargetRect();
    if (!start || !end) return;

    const ghost = document.createElement("img");
    ghost.src = activeSrc;
    ghost.alt = "flying image";
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${start.left}px`,
      top: `${start.top}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      objectFit: "contain",
      borderRadius: "12px",
      zIndex: "9999",
      pointerEvents: "none",
      transition:
        "transform 600ms cubic-bezier(0.22,1,0.36,1), opacity 600ms ease",
      opacity: "0.9",
      transform: "translate3d(0,0,0) scale(1)",
    } as CSSStyleDeclaration);
    document.body.appendChild(ghost);

    const startCx = start.left + start.width / 2;
    const startCy = start.top + start.height / 2;
    const endCx = end.left + end.width / 2;
    const endCy = end.top + end.height / 2;
    const dx = endCx - startCx;
    const dy = endCy - startCy;

    void ghost.offsetHeight;
    ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.25)`;
    ghost.style.opacity = "0.1";

    const cleanup = () => {
      ghost.removeEventListener("transitionend", cleanup);
      ghost.remove();
      pulseCart();
    };
    ghost.addEventListener("transitionend", cleanup);
  }

  /* ---------- Navegação ---------- */
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- Add to cart ---------- */
  function addToCart() {
    if (!selectedSize) {
      alert("Please choose a size first.");
      return;
    }
    const sel = sizes.find((s) => s.size === selectedSize);
    if (!sel || isUnavailable(sel)) {
      alert("This size is unavailable.");
      return;
    }
    if (qty < 1) {
      alert("Quantity must be at least 1.");
      return;
    }

    const optionsForCart: Record<string, string | null> = Object.fromEntries(
      Object.entries(selected).map(([k, v]) => [
        k,
        Array.isArray(v) ? (v.length ? v.join(",") : null) : (v ?? null),
      ])
    );

    startTransition(async () => {
      await addToCartAction({
        productId: product.id,
        qty,
        options: optionsForCart,
        personalization: showNameNumber ? { name: safeName, number: safeNumber } : null,
      });

      setJustAdded(true);
      setShowToast(true);
      flyToCart();

      window.setTimeout(() => setShowToast(false), 2000);
      window.setTimeout(() => setJustAdded(false), 900);
    });
  }

  /* ---------- UI ---------- */
  return (
    <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {showToast ? "Item added to cart." : ""}
      </div>

      {/* ===== GALLERY ===== */}
      <div className="rounded-2xl border bg-white w-full lg:w-[560px] flex-none lg:self-start p-6">
        <div className="flex items-center gap-4">
          {images.length > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="group h-10 w-10 shrink-0 rounded-full border bg-white/90 backdrop-blur shadow-md hover:shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronLeft />
            </button>
          ) : (
            <div className="h-10 w-10 shrink-0" />
          )}

          <div ref={imgWrapRef} className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white">
            <Image
              src={activeSrc}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 540px, 100vw"
              priority
              unoptimized
            />
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="group h-10 w-10 shrink-0 rounded-full border bg-white/90 backdrop-blur shadow-md hover:shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronRight />
            </button>
          ) : (
            <div className="h-10 w-10 shrink-0" />
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-4">
            <div
              ref={thumbsRef}
              className="mx-auto overflow-x-auto overflow-y-hidden whitespace-nowrap py-3 [scrollbar-width:none] [-ms-overflow-style:none]"
              style={{ maxWidth: STRIP_MAX_W }}
            >
              <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}`}</style>
              <div className="inline-flex gap-2 no-scrollbar" style={{ scrollBehavior: "smooth" }}>
                {images.map((src, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Image ${i + 1}`}
                      className={cx(
                        "relative flex-none h-[82px] w-[68px] rounded-xl border transition focus:outline-none",
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
                        <Image src={src} alt={`thumb ${i + 1}`} fill className="object-contain" sizes="68px" unoptimized />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== CONFIGURATOR ===== */}
      <div className="card p-6 space-y-6 flex-1 min-w-0">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{product.name}</h1>
          <div className="text-xl font-semibold">{money(product.basePrice)}</div>
          {product.description && (
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
          )}
        </header>

        {/* Size */}
        <div className="rounded-2xl border p-4 bg-white/70">
          <div className="mb-2 text-sm text-gray-700">
            Size ({kid ? "Kids" : "Adult"}) <span className="text-red-500">*</span>
          </div>

          {sizes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
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
                      "rounded-xl px-3 py-2 border text-sm transition",
                      unavailable ? "opacity-50 line-through cursor-not-allowed" : "hover:bg-gray-50",
                      isActive && "bg-blue-600 text-white border-blue-600"
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

          {kid && (
            <p className="mt-2 text-xs text-gray-500">
              Ages are approximate. If in between, we recommend sizing up.
            </p>
          )}
        </div>

        {/* Customization (FREE) — só mostra se existir grupo efetivo e tiver valores */}
        {effectiveCustomizationGroup && effectiveCustomizationGroup.values.length > 0 && (
          <GroupBlock
            group={effectiveCustomizationGroup}
            selected={selected}
            onPickRadio={setRadio}
            onToggleAddon={toggleAddon}
            forceFree
          />
        )}

        {/* Personalization inputs (FREE) */}
        {showNameNumber && (
          <div className="rounded-2xl border p-4 bg-white/70 space-y-4">
            <div className="text-sm text-gray-700">
              Personalization{" "}
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                FREE
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-gray-600">Name (uppercase)</span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. BELLINGHAM"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  maxLength={20}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">Number (0–99)</span>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5"
                  value={custNumber}
                  onChange={(e) => setCustNumber(e.target.value)}
                  inputMode="numeric"
                  maxLength={2}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">Personalization will be printed in the club’s official style.</p>
          </div>
        )}

        {/* Badges (FREE) — aparece se a escolha tiver "badge" e houver grupo (real ou virtual) */}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="rounded-XL border px-3 py-2 hover:bg-gray-50"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              disabled={pending}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center">{qty}</span>
            <button
              className="rounded-XL border px-3 py-2 hover:bg-gray-50"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              disabled={pending}
            >
              +
            </button>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-lg font-semibold">{money(finalPrice)}</div>
          </div>
        </div>

        {/* Add to cart */}
        <motion.button
          onClick={addToCart}
          className={cx(
            "btn-primary w-full sm:w-auto disabled:opacity-60 inline-flex items-center justify-center gap-2",
            justAdded && "bg-green-600 hover:bg-green-600"
          )}
          disabled={pending || !selectedSize || qty < 1}
          animate={justAdded ? { scale: [1, 1.05, 1] } : {}}
          transition={{ type: "spring", stiffness: 600, damping: 20, duration: 0.4 }}
        >
          {justAdded ? (
            <>
              <CheckIcon />
              Added!
            </>
          ) : pending ? (
            "Adding…"
          ) : (
            "Add to cart"
          )}
        </motion.button>
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
            className="fixed bottom-4 right-4 z-50"
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
      <div className="rounded-2xl border p-4 bg-white/70">
        <div className="mb-2 text-sm text-gray-700">
          {group.label} {group.required && <span className="text-red-500">*</span>}
        </div>
        <div className="grid gap-2">
          {group.values.map((v) => {
            const active = selected[group.key] === v.value;
            return (
              <label
                key={v.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition ${
                  active ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={group.key}
                    className="accent-blue-600"
                    checked={!!active}
                    onChange={() => onPickRadio(group.key, v.value)}
                  />
                  <span>{v.label}</span>
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
  const isActive = (value: string) => (Array.isArray(chosen) ? chosen.includes(value) : chosen === value);

  return (
    <div className="rounded-2xl border p-4 bg-white/70">
      <div className="mb-2 text-sm text-gray-700">
        {group.label} {group.required && <span className="text-red-500">*</span>}
      </div>
      <div className="grid gap-2">
        {group.values.map((v) => {
          const active = isActive(v.value);
          return (
            <label
              key={v.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition ${
                active ? "border-blue-600 ring-2 ring-blue-100" : "hover:bg-gray-50"
              }`}
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
                <span>{v.label}</span>
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
      className="mx-auto h-5 w-5 text-gray-900 group-hover:scale-110 transition-transform"
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
      className="mx-auto h-5 w-5 text-gray-900 group-hover:scale-110 transition-transform"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
