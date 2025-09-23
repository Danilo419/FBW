// src/app/products/[slug]/product-configurator.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Minus, ShoppingCart, Users } from "lucide-react";

/**
 * ✅ Opção 1 implementada: Adulto | Criança na MESMA página de produto
 *
 * Este componente mantém retrocompatibilidade com a tua estrutura atual
 * e adiciona suporte nativo a um seletor de categoria de tamanho (Adulto/Kids).
 *
 * ➜ Como usar (mínimo):
 *   - Mantém os campos existentes (id, slug, name, basePrice, images, sizes, optionGroups)
 *   - Para ativares a aba "Criança", passa `kidsSizes` (array de tamanhos kids)
 *   - Se quiseres preço diferente para Kids, define `kidsPriceDelta` (em cêntimos, pode ser negativo)
 *
 * Exemplo de product:
 * {
 *   id: "1",
 *   slug: "camisola-real-25-26",
 *   name: "Camisola Real Madrid 25/26",
 *   basePrice: 8990,
 *   images: ["/rm1.jpg", "/rm2.jpg"],
 *   sizes: [{ size: "S", stock: 5 }, { size: "M", stock: 8 }, ...], // ADULTO
 *   kidsSizes: [{ size: "6Y", stock: 3 }, { size: "8Y", stock: 2 }, ...], // opcional -> ativa a aba Criança
 *   kidsPriceDelta: -1000, // opcional (aqui -10€ para Kids)
 *   optionGroups: [...]
 * }
 */

type OptionType = "SIZE" | "RADIO" | "ADDON";

export type SizeItem = { size: string; stock: number };

type ProductClient = {
  id: string;
  slug: string;
  name: string;
  basePrice: number; // cents
  images: string[];
  // Tamanhos Adulto (obrigatório, mantém compatibilidade)
  sizes: SizeItem[];
  // Tamanhos Criança (opcional – ativa a aba Criança)
  kidsSizes?: SizeItem[];
  // Delta de preço para Kids (ex.: -1000 => -10€ face a basePrice)
  kidsPriceDelta?: number;
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

// Ordenações úteis
const ADULT_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const KIDS_ORDER = ["4Y", "6Y", "8Y", "10Y", "12Y", "14Y"]; 

function sortSizes(list: SizeItem[], isKids: boolean) {
  const order = isKids ? KIDS_ORDER : ADULT_ORDER;
  return [...list].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
}

export default function ProductConfigurator({ product }: { product: ProductClient }) {
  // Descobrir grupos (mantém o teu comportamento atual)
  const radioGroups = product.optionGroups.filter((g) => g.type === "RADIO");
  const addonGroups = product.optionGroups.filter((g) => g.type === "ADDON");

  // Está disponível Kids?
  const hasKids = (product.kidsSizes?.length ?? 0) > 0;

  // Estado
  type SizeCategory = "ADULT" | "KIDS";
  const [category, setCategory] = useState<SizeCategory>("ADULT");
  const [qty, setQty] = useState(1);

  const adultSizes = useMemo(() => sortSizes(product.sizes || [], false), [product.sizes]);
  const kidsSizes = useMemo(() => sortSizes(product.kidsSizes || [], true), [product.kidsSizes]);

  // Tamanho selecionado (por categoria)
  const [selectedAdultSize, setSelectedAdultSize] = useState<string | null>(adultSizes[0]?.size ?? null);
  const [selectedKidsSize, setSelectedKidsSize] = useState<string | null>(kidsSizes[0]?.size ?? null);

  const selectedSize = category === "ADULT" ? selectedAdultSize : selectedKidsSize;

  const stockForSize = useMemo(() => {
    if (!selectedSize) return 0;
    const pool = category === "ADULT" ? adultSizes : kidsSizes;
    return pool.find((s) => s.size === selectedSize)?.stock ?? 0;
  }, [adultSizes, kidsSizes, category, selectedSize]);

  // Estado dos radios e addons (mantém igual)
  const [selectedRadios, setSelectedRadios] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    radioGroups.forEach((g) => {
      if (g.required && g.values.length > 0) init[g.id] = g.values[0].value;
    });
    return init;
  });
  const [selectedAddons, setSelectedAddons] = useState<Record<number, boolean>>({});

  // Preço por unidade (base + delta kids + radios + addons)
  const unitPrice = useMemo(() => {
    let price = product.basePrice;

    if (category === "KIDS" && typeof product.kidsPriceDelta === "number") {
      price += product.kidsPriceDelta; // pode ser negativo
    }

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
  }, [product.basePrice, product.kidsPriceDelta, category, radioGroups, addonGroups, selectedRadios, selectedAddons]);

  const total = unitPrice * qty;

  function toggleAddon(groupId: number) {
    setSelectedAddons((p) => ({ ...p, [groupId]: !p[groupId] }));
  }

  function changeRadio(groupId: number, value: string) {
    setSelectedRadios((p) => ({ ...p, [groupId]: value }));
  }

  function addToCart() {
    if (!selectedSize) {
      alert("Escolhe um tamanho primeiro.");
      return;
    }
    if (qty < 1) {
      alert("A quantidade deve ser pelo menos 1.");
      return;
    }
    if (qty > stockForSize) {
      alert(`Só há ${stockForSize} em stock para o tamanho ${selectedSize}.`);
      return;
    }

    // Integra aqui com a tua store/API de carrinho
    console.log("ADD TO CART", {
      productId: product.id,
      slug: product.slug,
      qty,
      category,
      size: selectedSize,
      radios: selectedRadios,
      addons: selectedAddons,
      unitPrice,
      total,
    });
    alert("Adicionado ao carrinho (demo).");
  }

  // UI helpers
  const activeSizes = category === "ADULT" ? adultSizes : kidsSizes;

  return (
    <div className="card p-6 space-y-6">
      {/* Seletor Adulto | Criança */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Categoria de tamanho</div>
          <div className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-4 w-4"/> Adulto e Criança na mesma página</div>
        </div>
        <div className="flex gap-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setCategory("ADULT")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm transition ${category === "ADULT" ? "bg-white shadow" : "opacity-70 hover:opacity-100"}`}
          >
            Adulto
          </button>
          <button
            type="button"
            onClick={() => hasKids && setCategory("KIDS")}
            disabled={!hasKids}
            className={`flex-1 rounded-xl px-4 py-2 text-sm transition ${category === "KIDS" ? "bg-white shadow" : "opacity-70 hover:opacity-100"} ${!hasKids ? "cursor-not-allowed opacity-40" : ""}`}
          >
            Criança
          </button>
        </div>
        {category === "KIDS" && typeof product.kidsPriceDelta === "number" && (
          <div className={`mt-2 text-xs ${product.kidsPriceDelta < 0 ? "text-emerald-600" : "text-gray-700"}`}>
            {product.kidsPriceDelta < 0
              ? `Preço especial Kids: ${eur(product.kidsPriceDelta)}`
              : `Acréscimo Kids: +${eur(product.kidsPriceDelta)}`}
          </div>
        )}
      </div>

      {/* SIZE (por categoria) */}
      <div>
        <div className="font-semibold mb-2">Tamanho ({category === "ADULT" ? "Adulto" : "Criança"})</div>
        {activeSizes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeSizes.map((v) => {
              const isActive = (category === "ADULT" ? selectedAdultSize : selectedKidsSize) === v.size;
              const outOfStock = (v.stock ?? 0) <= 0;
              return (
                <button
                  key={`${category}-${v.size}`}
                  disabled={outOfStock}
                  onClick={() => {
                    if (category === "ADULT") setSelectedAdultSize(v.size);
                    else setSelectedKidsSize(v.size);
                  }}
                  className={`px-4 py-2 rounded-xl border text-sm transition ${
                    isActive ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                  } ${outOfStock ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Sem tamanhos disponíveis para esta categoria.</div>
        )}
        {selectedSize && (
          <div className="text-xs text-gray-600 mt-1">
            Stock para <b>{selectedSize}</b>: {stockForSize}
          </div>
        )}
      </div>

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
        Adicionar ao carrinho
      </button>
    </div>
  );
}
