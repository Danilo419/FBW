// src/app/products/[slug]/product-configurator.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Minus, ShoppingCart } from "lucide-react";

type OptionType = "SIZE" | "RADIO" | "ADDON";

type ProductClient = {
  id: string;
  slug: string;
  name: string;
  basePrice: number; // cents
  images: string[];
  sizes: { size: string; stock: number }[];
  optionGroups: {
    id: number;
    key: string;
    label: string;
    type: OptionType;
    required: boolean;
    values: { id: number; value: string; label: string; priceDelta: number }[];
  }[];
};

function eur(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default function ProductConfigurator({ product }: { product: ProductClient }) {
  // Descobrir grupos
  const sizeGroup = product.optionGroups.find((g) => g.type === "SIZE");
  const radioGroups = product.optionGroups.filter((g) => g.type === "RADIO");
  const addonGroups = product.optionGroups.filter((g) => g.type === "ADDON");

  // Estado
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    const first = sizeGroup?.values?.[0]?.value ?? product.sizes?.[0]?.size ?? null;
    return first;
  });
  const [selectedRadios, setSelectedRadios] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    radioGroups.forEach((g) => {
      if (g.required && g.values.length > 0) init[g.id] = g.values[0].value;
    });
    return init;
  });
  const [selectedAddons, setSelectedAddons] = useState<Record<number, boolean>>({});

  const stockForSize = useMemo(() => {
    if (!selectedSize) return 0;
    return product.sizes.find((s) => s.size === selectedSize)?.stock ?? 0;
  }, [product.sizes, selectedSize]);

  const unitPrice = useMemo(() => {
    let price = product.basePrice;

    for (const g of radioGroups) {
      const chosen = selectedRadios[g.id];
      if (!chosen) continue;
      const v = g.values.find((x) => x.value === chosen);
      if (v) price += v.priceDelta;
    }

    for (const g of addonGroups) {
      if (selectedAddons[g.id]) {
        const v = g.values[0];
        if (v) price += v.priceDelta;
      }
    }

    return price;
  }, [product.basePrice, radioGroups, addonGroups, selectedRadios, selectedAddons]);

  const total = unitPrice * qty;

  function toggleAddon(groupId: number) {
    setSelectedAddons((p) => ({ ...p, [groupId]: !p[groupId] }));
  }

  function changeRadio(groupId: number, value: string) {
    setSelectedRadios((p) => ({ ...p, [groupId]: value }));
  }

  function addToCart() {
    if (!selectedSize) {
      alert("Choose a size first.");
      return;
    }
    if (qty < 1) {
      alert("Quantity must be at least 1.");
      return;
    }
    if (qty > stockForSize) {
      alert(`Only ${stockForSize} in stock for size ${selectedSize}.`);
      return;
    }

    // Integra aqui com a tua store/API de carrinho
    console.log("ADD TO CART", {
      productId: product.id,
      slug: product.slug,
      qty,
      size: selectedSize,
      radios: selectedRadios,
      addons: selectedAddons,
      unitPrice,
      total,
    });
    alert("Added to cart (demo).");
  }

  return (
    <div className="card p-6 space-y-6">
      {/* SIZE */}
      {sizeGroup && (
        <div>
          <div className="font-semibold mb-2">{sizeGroup.label}</div>
          <div className="flex flex-wrap gap-2">
            {sizeGroup.values.map((v) => {
              const isActive = selectedSize === v.value;
              const outOfStock =
                (product.sizes.find((s) => s.size === v.value)?.stock ?? 0) <= 0;

              return (
                <button
                  key={v.value}
                  disabled={outOfStock}
                  onClick={() => setSelectedSize(v.value)}
                  className={`px-4 py-2 rounded-xl border text-sm transition ${
                    isActive ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                  } ${outOfStock ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          {selectedSize && (
            <div className="text-xs text-gray-600 mt-1">
              Stock for <b>{selectedSize}</b>: {stockForSize}
            </div>
          )}
        </div>
      )}

      {/* RADIOS */}
      {radioGroups.map((g) => (
        <div key={g.id} className="space-y-2">
          <div className="font-semibold">{g.label}</div>
          <div className="grid gap-2">
            {g.values.map((v) => {
              const checked = selectedRadios[g.id] === v.value;
              return (
                <label
                  key={v.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2 cursor-pointer ${
                    checked ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => changeRadio(g.id, v.value)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        checked ? "border-blue-600" : "border-gray-300"
                      }`}
                    >
                      {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    </span>
                    {v.label}
                  </span>
                  {v.priceDelta !== 0 && (
                    <span className="text-sm text-gray-700">
                      {v.priceDelta > 0 ? `+ ${eur(v.priceDelta)}` : eur(v.priceDelta)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* ADDONS */}
      {addonGroups.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold">Extras</div>
          <div className="grid gap-2">
            {addonGroups.map((g) => {
              const checked = !!selectedAddons[g.id];
              const v = g.values[0];
              return (
                <label
                  key={g.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2 cursor-pointer ${
                    checked ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => toggleAddon(g.id)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                        checked ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {g.label}
                  </span>
                  {v && v.priceDelta !== 0 && (
                    <span className="text-sm text-gray-700">
                      {v.priceDelta > 0 ? `+ ${eur(v.priceDelta)}` : eur(v.priceDelta)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* QTY + TOTAL */}
      <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="decrease"
            className="rounded-md border px-2 py-1 hover:bg-gray-50"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center">{qty}</span>
          <button
            aria-label="increase"
            className="rounded-md border px-2 py-1 hover:bg-gray-50"
            onClick={() => setQty((q) => Math.min(q + 1, stockForSize || 99))}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Unit</div>
          <div className="text-lg font-semibold">{eur(unitPrice)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-lg font-semibold">{eur(total)}</div>
        </div>
      </div>

      <button
        onClick={addToCart}
        className="btn-primary w-full justify-center gap-2"
        disabled={!selectedSize || qty < 1 || qty > stockForSize}
      >
        <ShoppingCart className="h-4 w-4" />
        Add to cart
      </button>
    </div>
  );
}
