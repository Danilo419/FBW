// src/components/ProductOptions.tsx
"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { OptionGroup, OptionValue, Product, SizeStock } from "@prisma/client";

type ProductWithOptions = Product & {
  sizes: SizeStock[];
  options: (OptionGroup & { values: OptionValue[] })[];
};

export function ProductOptions({ product }: { product: ProductWithOptions }) {
  const [selected, setSelected] = useState<Record<string, string | boolean | undefined>>({
    customization: "none",
  });
  const [nameText, setNameText] = useState("");
  const [numberText, setNumberText] = useState("");

  const sizeGroup = product.options.find((o) => o.type === "SIZE");
  const custGroup = product.options.find((o) => o.key === "customization");

  const finalPrice = useMemo(() => {
    let total = product.basePrice;
    for (const g of product.options) {
      const choice = selected[g.key];
      if (!choice) continue;

      if (g.type === "ADDON") {
        if (choice === true || choice === "yes") {
          total += g.values[0]?.priceDelta ?? 0;
        }
      } else {
        const v = g.values.find((v) => v.value === choice);
        if (v) total += v.priceDelta;
      }
    }
    return total;
  }, [product, selected]);

  function setValue(groupKey: string, value: string | boolean | undefined) {
    setSelected((prev) => ({ ...prev, [groupKey]: value }));
  }

  function shouldAskNameNumber() {
    const v = selected["customization"];
    return v === "name-number" || v === "name-number-badge";
  }

  function addToCart() {
    // Basic required-option validation
    for (const g of product.options) {
      if (!g.required) continue;
      const v = selected[g.key];
      if (!v) {
        alert(`Please select: ${g.label}`);
        return;
      }
    }

    const lineItem = {
      productId: product.id,
      quantity: 1,
      options: selected,
      meta: shouldAskNameNumber()
        ? { name: nameText.trim(), number: numberText.trim() }
        : undefined,
      unitPrice: finalPrice,
    };

    console.log("ADD_TO_CART", lineItem);
    // TODO: send to cart (zustand/context) or POST /api/cart
  }

  return (
    <div className="space-y-6">
      {/* Size */}
      {sizeGroup && (
        <div>
          <div className="mb-1 font-medium">{sizeGroup.label}</div>
          <div className="grid grid-cols-4 gap-2">
            {sizeGroup.values.map((v) => {
              const available =
                product.sizes.find((s) => s.size === v.value)?.available ?? false;
              const disabled = !available;
              const active = selected[sizeGroup.key] === v.value;

              return (
                <button
                  key={v.value}
                  disabled={disabled}
                  onClick={() => setValue(sizeGroup.key, v.value)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    active ? "bg-blue-600 text-white" : "hover:bg-gray-50"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={disabled ? "Out of stock" : "Available"}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customization */}
      {custGroup && (
        <div>
          <div className="mb-1 font-medium">{custGroup.label}</div>
          <div className="grid gap-2">
            {custGroup.values.map((v) => {
              const checked = selected[custGroup.key] === v.value;
              return (
                <label
                  key={v.value}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="customization"
                    checked={!!checked}
                    onChange={() => setValue(custGroup.key, v.value)}
                  />
                  <span className="flex-1">{v.label}</span>
                  {v.priceDelta > 0 && (
                    <span className="text-gray-600 text-sm">
                      + {formatMoney(v.priceDelta)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Conditional: Name/Number */}
          {shouldAskNameNumber() && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Name (jersey)"
                maxLength={12}
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
              />
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="Number"
                inputMode="numeric"
                maxLength={2}
                value={numberText}
                onChange={(e) =>
                  setNumberText(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Add-ons: shorts/socks */}
      {product.options
        .filter((o) => o.type === "ADDON")
        .map((g) => {
          const chosen =
            selected[g.key] === true || selected[g.key] === "yes";
          const delta = g.values[0]?.priceDelta ?? 0;
          return (
            <label
              key={g.key}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={chosen}
                onChange={(e) =>
                  setValue(g.key, e.target.checked ? "yes" : undefined)
                }
              />
              <span className="flex-1">{g.label}</span>
              {delta > 0 && (
                <span className="text-gray-600 text-sm">
                  + {formatMoney(delta)}
                </span>
              )}
            </label>
          );
        })}

      {/* Total + CTA */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xl font-bold">{formatMoney(finalPrice)}</div>
        <button onClick={addToCart} className="btn-primary">
          Add to cart
        </button>
      </div>
    </div>
  );
}
