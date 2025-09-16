// src/components/ProductConfigurator.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { addToCartAction } from "@/app/(store)/cart/actions";
import { money } from "@/lib/money";

/* ====================== Tipos (UI) ====================== */
type OptionValueUI = {
  id: string;
  value: string;
  label: string;
  priceDelta: number;
};

type OptionGroupUI = {
  id: string;
  key: string;
  label: string;
  type: "SIZE" | "RADIO" | "ADDON";
  required: boolean;
  values: OptionValueUI[];
};

type SizeUI = {
  id: string;
  size: string;
  stock: number;
};

type ProductUI = {
  id: string;
  slug: string;
  name: string;
  team?: string | null;
  description?: string | null;
  basePrice: number;
  images: string[];
  sizes: SizeUI[];
  optionGroups: OptionGroupUI[];
};

type Props = {
  product: ProductUI;
};

/* =============== helpers =============== */
/** Garante que o seletor de tamanhos tenha XS, S, M, L, XL, 2XL, 3XL. */
function ensureUpTo3XL(values: OptionValueUI[]): OptionValueUI[] {
  const wanted = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const byVal = new Map(values.map((v) => [v.value.toUpperCase(), v]));
  const result: OptionValueUI[] = [];

  for (const w of wanted) {
    const existing = byVal.get(w);
    if (existing) {
      result.push(existing);
    } else {
      // cria opção simples sem custo
      result.push({
        id: `extra-${w}`,
        value: w,
        label: w,
        priceDelta: 0,
      });
    }
  }
  return result;
}

/* ====================== Componente ====================== */
export default function ProductConfigurator({ product }: Props) {
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [custName, setCustName] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const activeSrc = images[Math.min(activeIndex, images.length - 1)];

  const sizeGroupRaw = product.optionGroups.find((g) => g.key === "size");
  const sizeGroup = useMemo<OptionGroupUI | null>(() => {
    if (!sizeGroupRaw) return null;
    return { ...sizeGroupRaw, values: ensureUpTo3XL(sizeGroupRaw.values || []) };
  }, [sizeGroupRaw]);

  const customizationGroup = product.optionGroups.find((g) => g.key === "customization");
  const shortsGroup = product.optionGroups.find((g) => g.key === "shorts");
  const socksGroup = product.optionGroups.find((g) => g.key === "socks");
  const otherGroups = product.optionGroups.filter(
    (g) => !["size", "customization", "shorts", "socks"].includes(g.key)
  );

  const customization = selected["customization"] ?? "";
  const showNameNumber = customization.includes("name-number");

  /* Total */
  const finalPrice = useMemo(() => {
    let total = product.basePrice;
    for (const g of product.optionGroups) {
      const chosen = selected[g.key];
      if (!chosen) continue;
      const v = g.values.find((x) => x.value === chosen);
      if (v) total += v.priceDelta;
    }
    return total * qty;
  }, [product.basePrice, product.optionGroups, selected, qty]);

  const onPick = (groupKey: string, value: string) => {
    setSelected((s) => ({ ...s, [groupKey]: value || null }));
  };

  /* Normalização de inputs da personalização */
  const safeName = useMemo(
    () => custName.toUpperCase().replace(/[^A-Z .'-]/g, "").slice(0, 14),
    [custName]
  );
  const safeNumber = useMemo(() => custNumber.replace(/\D/g, "").slice(0, 2), [custNumber]);

  /* Add to cart (server action) */
  const addToCart = () => {
    startTransition(async () => {
      await addToCartAction({
        productId: product.id,
        qty,
        options: selected,
        personalization: showNameNumber ? { name: safeName, number: safeNumber } : null,
      });
      // aqui podes abrir um drawer/toast ou navegar para o carrinho
    });
  };

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
      {/* Galeria */}
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

      {/* Configurador */}
      <div className="card p-6 space-y-6 flex-1 min-w-0">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{product.name}</h1>
          {product.team && <div className="text-gray-600">{product.team}</div>}
          {product.description && (
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
          )}
        </header>

        {/* Size */}
        {sizeGroup && <GroupBlock group={sizeGroup} selected={selected} onPick={onPick} />}

        {/* Customization */}
        {customizationGroup && (
          <GroupBlock group={customizationGroup} selected={selected} onPick={onPick} />
        )}

        {/* Personalization (sem “Choose a player”) */}
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

        {/* Add-ons */}
        {shortsGroup && <GroupBlock group={shortsGroup} selected={selected} onPick={onPick} />}
        {socksGroup && <GroupBlock group={socksGroup} selected={selected} onPick={onPick} />}
        {otherGroups.map((g) => (
          <GroupBlock key={g.id} group={g} selected={selected} onPick={onPick} />
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

          <div className="text-xl font-semibold">{money(finalPrice)}</div>
        </div>

        {/* CTA */}
        <button
          onClick={addToCart}
          className="btn-primary w-full sm:w-auto disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

/* ====================== Sub-componente de Grupo ====================== */
function GroupBlock({
  group,
  selected,
  onPick,
}: {
  group: OptionGroupUI;
  selected: Record<string, string | null>;
  onPick: (key: string, value: string) => void;
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
                onClick={() => onPick(group.key, v.value)}
                className={`rounded-xl px-3 py-2 border text-sm transition ${
                  active ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                }`}
                aria-pressed={active}
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
                    checked={active}
                    onChange={() => onPick(group.key, v.value)}
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

  // ADDON (checkbox)
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
                  type="checkbox"
                  className="accent-blue-600"
                  checked={active}
                  onChange={(e) => onPick(group.key, e.target.checked ? v.value : "")}
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
