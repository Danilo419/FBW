// src/app/admin/(panel)/products/new/sizes-picker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type SizesPickerProps = {
  adultSizes: string[];
  kidSizes: string[];
};

/**
 * Regras:
 * - Trocar o grupo (adult/kid) seleciona TODOS desse grupo e desmarca o outro (que fica desativado).
 * - Envia inputs hidden "sizes" com os tamanhos finais para o server action.
 */
export default function SizesPicker({ adultSizes, kidSizes }: SizesPickerProps) {
  const [group, setGroup] = useState<"adult" | "kid">("adult");
  const [selectedAdult, setSelectedAdult] = useState<string[]>(adultSizes);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);

  // Quando muda o grupo → marcar todos do grupo e limpar o outro
  useEffect(() => {
    if (group === "adult") {
      setSelectedAdult(adultSizes);
      setSelectedKid([]);
    } else {
      setSelectedKid(kidSizes);
      setSelectedAdult([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const hiddenInputs = useMemo(() => {
    const list = group === "adult" ? selectedAdult : selectedKid;
    return (
      <>
        <input type="hidden" name="sizeGroup" value={group} />
        {list.map((s) => (
          <input key={s} type="hidden" name="sizes" value={s} />
        ))}
      </>
    );
  }, [group, selectedAdult, selectedKid]);

  return (
    <div className="space-y-3">
      <label htmlFor="sizeGroup" className="text-sm font-medium">Sizes</label>

      <select
        id="sizeGroup"
        value={group}
        onChange={(e) => setGroup(e.target.value as "adult" | "kid")}
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
      >
        <option value="adult">Adult sizes</option>
        <option value="kid">Kid sizes</option>
      </select>

      <p className="text-xs text-gray-500">
        Switching group selects all in that group and disables the other group.
      </p>

      {/* Adult */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-gray-500">Adult</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {adultSizes.map((s) => {
            const disabled = group === "kid";
            const checked = selectedAdult.includes(s);
            return (
              <label
                key={s}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  disabled ? "opacity-40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={() =>
                    setSelectedAdult((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )
                  }
                />
                <span className="text-sm">{s}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Kid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-gray-500">Kid</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {kidSizes.map((s) => {
            const disabled = group === "adult";
            const checked = selectedKid.includes(s);
            return (
              <label
                key={s}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  disabled ? "opacity-40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={() =>
                    setSelectedKid((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    )
                  }
                />
                <span className="text-sm">{s}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Inputs escondidos com a lista final (lidos pelo server action) */}
      {hiddenInputs}
    </div>
  );
}
