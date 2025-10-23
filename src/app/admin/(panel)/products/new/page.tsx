// src/app/admin/(panel)/products/new/page.tsx
"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const KID_SIZES = ["2-3y", "3-4y", "4-5y", "6-7y", "8-9y", "10-11y", "12-13y"];

export default function NewProductPage() {
  const [sizeGroup, setSizeGroup] = useState<"adult" | "kid">("adult");
  const [selectedAdult, setSelectedAdult] = useState<string[]>([...ADULT_SIZES]);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);

  function handleSizeGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const group = e.target.value as "adult" | "kid";
    setSizeGroup(group);
    if (group === "adult") {
      setSelectedAdult([...ADULT_SIZES]);
      setSelectedKid([]);
    } else {
      setSelectedKid([...KID_SIZES]);
      setSelectedAdult([]);
    }
  }

  function toggleAdult(size: string) {
    setSelectedAdult((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function toggleKid(size: string) {
    setSelectedKid((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // incluir tamanhos selecionados
    formData.append("sizeGroup", sizeGroup);
    const sizes =
      sizeGroup === "adult" ? selectedAdult : selectedKid;
    sizes.forEach((s) => formData.append("sizes", s));

    await fetch("/api/admin/create-product", {
      method: "POST",
      body: formData,
    });

    alert("Product created successfully!");
    form.reset();
    setSelectedAdult([...ADULT_SIZES]);
    setSelectedKid([]);
    setSizeGroup("adult");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Create Product</h1>
        <p className="text-sm text-gray-500">Create a new product from scratch.</p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow border">
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., Real Madrid Home 25/26"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="team" className="text-sm font-medium">Team</label>
              <input
                id="team"
                name="team"
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., Real Madrid"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="season" className="text-sm font-medium">Season (optional)</label>
              <input
                id="season"
                name="season"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., 25/26"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">Base Price (EUR)</label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., 39.90"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Short description..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              className="block w-full rounded-xl border px-3 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-900"
            />
            <p className="text-xs text-gray-500">
              You can select multiple images. The first will be the main image.
            </p>
          </div>

          {/* Size group selection */}
          <div className="space-y-3">
            <label htmlFor="sizeGroup" className="text-sm font-medium">Sizes</label>
            <select
              id="sizeGroup"
              value={sizeGroup}
              onChange={handleSizeGroupChange}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="adult">Adult sizes</option>
              <option value="kid">Kid sizes</option>
            </select>
            <p className="text-xs text-gray-500">
              Selecting one group automatically enables only its sizes.
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Adult</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ADULT_SIZES.map((s) => (
                  <label
                    key={s}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      sizeGroup === "kid" ? "opacity-40" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={s}
                      checked={selectedAdult.includes(s)}
                      disabled={sizeGroup === "kid"}
                      onChange={() => toggleAdult(s)}
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Kid</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {KID_SIZES.map((s) => (
                  <label
                    key={s}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      sizeGroup === "adult" ? "opacity-40" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={s}
                      checked={selectedKid.includes(s)}
                      disabled={sizeGroup === "adult"}
                      onChange={() => toggleKid(s)}
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <a
              href="/admin/products"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900"
            >
              Create Product
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
