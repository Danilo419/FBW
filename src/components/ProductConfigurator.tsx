// src/components/ProductConfigurator.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { addToCartAction } from "@/app/(store)/cart/actions";
import { money } from "@/lib/money";

/* ====================== UI Types ====================== */
type OptionValueUI = {
  id: string;
  value: string;
  label: string;
  priceDelta: number; // cents
};

type OptionGroupUI = {
  id: string;
  key: string; // e.g., "customization", "shorts", "socks", "badges"
  label: string;
  type: "SIZE" | "RADIO" | "ADDON";
  required: boolean;
  values: OptionValueUI[];
};

type SizeUI = {
  id: string;
  size: string; // e.g., "XS", "S", "M", "10Y"
  stock: number; // ignored on UI
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number; // cents
  images: string[];
  sizes: SizeUI[];      // Adult
  kidsSizes?: SizeUI[]; // Kids (optional)
  kidsPriceDelta?: number;
  optionGroups: OptionGroupUI[];
};

type SelectedState = Record<string, string | string[] | null>;

type Props = {
  product: ProductUI;
};

/* ====================== Component ====================== */
export default function ProductConfigurator({ product }: Props) {
  const [selected, setSelected] = useState<SelectedState>({});
  const [custName, setCustName] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const activeSrc = images[Math.min(activeIndex, images.length - 1)];

  /* ---------- Adult/Kids logic ---------- */
  type SizeCategory = "ADULT" | "KIDS";
  const hasKids = (product.kidsSizes?.length ?? 0) > 0;
  const [category, setCategory] = useState<SizeCategory>("ADULT");

  const adultSizes = useMemo<SizeUI[]>(() => product.sizes ?? [], [product.sizes]);
  const kidsSizes = useMemo<SizeUI[]>(() => product.kidsSizes ?? [], [product.kidsSizes]);

  const [selectedAdultSize, setSelectedAdultSize] = useState<string | null>(
    adultSizes[0]?.size ?? null
  );
  const [selectedKidsSize, setSelectedKidsSize] = useState<string | null>(
    kidsSizes[0]?.size ?? null
  );

  const activeSizes = category === "ADULT" ? adultSizes : kidsSizes;
  const selectedSize = category === "ADULT" ? selectedAdultSize : selectedKidsSize;

  const pickSize = (size: string) => {
    if (category === "ADULT") setSelectedAdultSize(size);
    else setSelectedKidsSize(size);
    setSelected((s) => ({ ...s, size }));
  };

  const switchCategory = (next: SizeCategory) => {
    setCategory(next);
    const size = next === "ADULT" ? selectedAdultSize : selectedKidsSize;
    setSelected((s) => ({ ...s, size: size ?? null }));
  };

  /* ---------- Groups ---------- */
  const customizationGroup = product.optionGroups.find((g) => g.key === "customization");
  const badgesGroup = product.optionGroups.find((g) => g.key === "badges"); // <— novo
  const shortsGroup = product.optionGroups.find((g) => g.key === "shorts");
  const socksGroup = product.optionGroups.find((g) => g.key === "socks");
  const otherGroups = product.optionGroups.filter(
    (g) => !["size", "customization", "shorts", "socks", "badges"].includes(g.key)
  );

  const customization = selected["customization"] ?? "";
  const showNameNumber = typeof customization === "string" && customization.includes("name-number");
  const showBadgePicker =
    typeof customization === "string" && customization.includes("badge") && !!badgesGroup;

  const setRadio = (key: string, value: string) =>
    setSelected((s) => ({ ...s, [key]: value || null }));

  // suporta múltiplas seleções num grupo ADDON
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

  /* ---------- Price logic ---------- */
  const { unitJerseyPrice, finalPrice } = useMemo(() => {
    let jersey = product.basePrice;

    if (category === "KIDS" && typeof product.kidsPriceDelta === "number") {
      jersey += product.kidsPriceDelta;
    }

    for (const g of product.optionGroups) {
      if (g.type !== "RADIO") continue;
      const chosen = selected[g.key];
      if (!chosen || typeof chosen !== "string") continue;
      const v = g.values.find((x) => x.value === chosen);
      if (v) jersey += v.priceDelta;
    }

    let addons = 0;
    for (const g of product.optionGroups) {
      if (g.type !== "ADDON") continue;
      const chosen = selected[g.key];
      if (Array.isArray(chosen)) {
        for (const val of chosen) {
          const v = g.values.find((x) => x.value === val);
          if (v) addons += v.priceDelta;
        }
      } else if (typeof chosen === "string" && chosen) {
        const v = g.values.find((x) => x.value === chosen);
        if (v) addons += v.priceDelta;
      }
    }

    return {
      unitJerseyPrice: jersey,
      finalPrice: (jersey + addons) * qty,
    };
  }, [product.basePrice, product.kidsPriceDelta, category, product.optionGroups, selected, qty]);

  /* ---------- Inputs sanitize ---------- */
  const safeName = useMemo(
    () => custName.toUpperCase().replace(/[^A-Z .'-]/g, "").slice(0, 14),
    [custName]
  );
  const safeNumber = useMemo(() => custNumber.replace(/\D/g, "").slice(0, 2), [custNumber]);

  /* ---------- Add to cart ---------- */
  const addToCart = () => {
    if (!selectedSize) {
      alert("Please choose a size first.");
      return;
    }
    if (qty < 1) {
      alert("Quantity must be at least 1.");
      return;
    }

    // Converter arrays para string (ex.: "ucl,la-liga") para bater com a action
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
    });
  };

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      {/* Gallery */}
      <div className="rounded-2xl border bg-white p-4 w-full lg:w-[560px] flex-none lg:self-start">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white">
          <Image
            src={activeSrc}
            alt={product.name}
            fill
            className="object-contain"
            sizes="(min-width: 1024px) 560px, 100vw"
            priority
          />
        </div>

        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`relative aspect-[3/4] overflow-hidden rounded-xl border transition ${
                  i === activeIndex ? "ring-2 ring-blue-600" : "hover:opacity-90"
                }`}
                aria-label={`Image ${i + 1}`}
              >
                <Image src={src} alt={`thumb ${i + 1}`} fill className="object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Configurator */}
      <div className="card p-6 space-y-6 flex-1 min-w-0">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{product.name}</h1>
          <div className="text-xl font-semibold">{money(unitJerseyPrice)}</div>
          {product.description && (
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
          )}
        </header>

        {hasKids && (
          <div className="rounded-2xl border p-4 bg-white/70 space-y-2">
            <div className="text-sm text-gray-700">Category *</div>
            <div className="inline-flex items-center rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => switchCategory("ADULT")}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  category === "ADULT" ? "bg-blue-600 text-white shadow" : "hover:bg-white"
                }`}
                aria-pressed={category === "ADULT"}
              >
                Adult
              </button>
              <button
                type="button"
                onClick={() => switchCategory("KIDS")}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  category === "KIDS" ? "bg-blue-600 text-white shadow" : "hover:bg-white"
                }`}
                aria-pressed={category === "KIDS"}
              >
                Kids
              </button>
            </div>
          </div>
        )}

        {/* Size */}
        <div className="rounded-2xl border p-4 bg-white/70">
          <div className="mb-2 text-sm text-gray-700">
            Size ({category === "ADULT" ? "Adult" : "Kids"}) <span className="text-red-500">*</span>
          </div>

          {activeSizes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeSizes.map((s) => {
                const isActive = selectedSize === s.size;
                return (
                  <button
                    key={`${category}-${s.size}`}
                    type="button"
                    onClick={() => pickSize(s.size)}
                    className={`rounded-xl px-3 py-2 border text-sm transition ${
                      isActive ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                    }`}
                    aria-pressed={isActive}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No sizes available for this category.</div>
          )}
        </div>

        {/* Customization (radio) */}
        {customizationGroup && (
          <GroupBlock
            group={customizationGroup}
            selected={selected}
            onPickRadio={setRadio}
            onToggleAddon={toggleAddon}
          />
        )}

        {/* Competition Badges (ADDON) — só aparece se o cliente escolher uma opção com "badge" */}
        {showBadgePicker && badgesGroup && (
          <GroupBlock
            group={badgesGroup}
            selected={selected}
            onPickRadio={setRadio}
            onToggleAddon={toggleAddon}
          />
        )}

        {/* Personalization */}
        {showNameNumber && (
          <div className="rounded-2xl border p-4 bg-white/70 space-y-4">
            <div className="text-sm text-gray-700">Personalization</div>
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
            <p className="text-xs text-gray-500">
              Personalization will be printed in the club’s official style.
            </p>
          </div>
        )}

        {/* Add-ons & others */}
        {shortsGroup && (
          <GroupBlock
            group={shortsGroup}
            selected={selected}
            onPickRadio={setRadio}
            onToggleAddon={toggleAddon}
          />
        )}
        {socksGroup && (
          <GroupBlock
            group={socksGroup}
            selected={selected}
            onPickRadio={setRadio}
            onToggleAddon={toggleAddon}
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

        {/* Qty + Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border px-3 py-2 hover:bg-gray-50"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              disabled={pending}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center">{qty}</span>
            <button
              className="rounded-xl border px-3 py-2 hover:bg-gray-50"
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

        <button
          onClick={addToCart}
          className="btn-primary w-full sm:w-auto disabled:opacity-60"
          disabled={pending || !selectedSize || qty < 1}
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
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
}: {
  group: OptionGroupUI;
  selected: SelectedState;
  onPickRadio: (key: string, value: string) => void;
  onToggleAddon: (key: string, value: string, checked: boolean) => void;
}) {
  if (group.type === "SIZE") {
    return (
      <div className="rounded-2xl border p-4 bg-white/70">
        <div className="mb-2 text-sm text-gray-700">
          {group.label} {group.required && <span className="text-red-500">*</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {group.values.map((v) => {
            const active = selected[group.key] === v.value;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onPickRadio(group.key, v.value)}
                className={`rounded-xl px-3 py-2 border text-sm transition ${
                  active ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                }`}
                aria-pressed={!!active}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
                {v.priceDelta !== 0 && (
                  <span className="text-sm text-gray-600">+ {money(v.priceDelta)}</span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // ADDON (checkbox - pode ser usado para "badges", "shorts", "socks", etc.)
  const chosen = selected[group.key];
  const isActive = (value: string) =>
    Array.isArray(chosen) ? chosen.includes(value) : chosen === value;

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
                  onChange={(e) => onToggleAddon(group.key, v.value, e.target.checked)}
                />
                <span>{v.label}</span>
              </div>
              {v.priceDelta !== 0 && (
                <span className="text-sm text-gray-600">+ {money(v.priceDelta)}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
