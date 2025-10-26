// src/app/admin/(panel)/products/new/page.tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { upload } from "@vercel/blob/client"; // upload direto do browser

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const KID_SIZES = ["2-3y", "3-4y", "4-5y", "6-7y", "8-9y", "10-11y", "12-13y"];

/** ---- Badge catalog (values/labels in EN) ---- */
type BadgeOption = { value: string; label: string };

const BADGE_GROUPS: { title: string; items: BadgeOption[] }[] = [
  {
    title: "Domestic Leagues – Europe (Top 8)",
    items: [
      { value: "premier-league-regular", label: "Premier League – League Badge" },
      { value: "premier-league-champions", label: "Premier League – Champions (Gold)" },

      { value: "la-liga-regular", label: "La Liga – League Badge" },
      { value: "la-liga-champions", label: "La Liga – Champion" },

      { value: "serie-a-regular", label: "Serie A – League Badge" },
      { value: "serie-a-scudetto", label: "Italy – Scudetto (Serie A Champion)" },

      { value: "bundesliga-regular", label: "Bundesliga – League Badge" },
      { value: "bundesliga-champions", label: "Bundesliga – Champion (Meister Badge)" },

      { value: "ligue1-regular", label: "Ligue 1 – League Badge" },
      { value: "ligue1-champions", label: "Ligue 1 – Champion" },

      { value: "primeira-liga-regular", label: "Primeira Liga (Portugal) – League Badge" },
      { value: "primeira-liga-champions", label: "Primeira Liga – Champion" },

      { value: "eredivisie-regular", label: "Eredivisie – League Badge" },
      { value: "eredivisie-champions", label: "Eredivisie – Champion" },

      { value: "scottish-premiership-regular", label: "Scottish Premiership – League Badge" },
      { value: "scottish-premiership-champions", label: "Scottish Premiership – Champion" },
    ],
  },
  {
    title: "Domestic Leagues – Others mentioned",
    items: [
      { value: "mls-regular", label: "MLS – League Badge" },
      { value: "mls-champions", label: "MLS – Champions (MLS Cup Holders)" },

      { value: "brasileirao-regular", label: "Brazil – Brasileirão – League Badge" },
      { value: "brasileirao-champions", label: "Brazil – Brasileirão – Champion" },

      { value: "super-lig-regular", label: "Turkey – Süper Lig – League Badge" },
      { value: "super-lig-champions", label: "Turkey – Süper Lig – Champion (if applicable)" },

      { value: "spl-saudi-regular", label: "Saudi Pro League – League Badge" },
      { value: "spl-saudi-champions", label: "Saudi Pro League – Champion (if applicable)" },
    ],
  },
  {
    title: "UEFA Competitions",
    items: [
      { value: "ucl-regular", label: "UEFA Champions League – Starball Badge" },
      { value: "ucl-winners", label: "UEFA Champions League – Winners Badge" },

      { value: "uel-regular", label: "UEFA Europa League – Badge" },
      { value: "uel-winners", label: "UEFA Europa League – Winners Badge" },

      { value: "uecl-regular", label: "UEFA Europa Conference League – Badge" },
      { value: "uecl-winners", label: "UEFA Europa Conference League – Winners Badge" },
    ],
  },
  {
    title: "International Club",
    items: [{ value: "club-world-cup-champions", label: "Club World Cup – Champions Badge" }],
  },
];

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export default function NewProductPage() {
  const [sizeGroup, setSizeGroup] = useState<"adult" | "kid">("adult");

  // Sizes default
  const [selectedAdult, setSelectedAdult] = useState<string[]>([...ADULT_SIZES]);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);

  // Badges (multi-select)
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  // Images → upload direto para Blob; guardamos apenas URLs
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  function handleSizeGroupChange(e: ChangeEvent<HTMLSelectElement>) {
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

  function toggleBadge(value: string) {
    setSelectedBadges((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // helper p/ nome único
  const uniqueName = (file: File) => {
    const safe = file.name.replace(/\s+/g, "_");
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    return `${id}_${safe}`;
  };

  // ⬇️ Upload direto com @vercel/blob/client (robusto e incremental + nomes únicos)
  async function handleImagesSelected(files: FileList | null, input?: HTMLInputElement) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED.has(file.type)) {
        errors.push(`${file.name}: unsupported type`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: bigger than 8MB`);
        continue;
      }

      try {
        const name = uniqueName(file); // ← evita “blob already exists”
        const { url } = await upload(name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        setImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
      } catch (e: any) {
        errors.push(`${file.name}: ${e?.message ?? "upload failed"}`);
      }
    }

    if (input) input.value = ""; // poder selecionar os mesmos ficheiros de novo
    setUploading(false);

    if (errors.length) {
      alert("Some files failed:\n" + errors.join("\n"));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Sizes
    formData.append("sizeGroup", sizeGroup);
    const sizes = sizeGroup === "adult" ? selectedAdult : selectedKid;
    sizes.forEach((s) => formData.append("sizes", s));

    // Badges
    selectedBadges.forEach((b) => formData.append("badges", b));

    // Image URLs (apenas URLs)
    imageUrls.forEach((u) => formData.append("imageUrls", u));
    formData.delete("images");

    const res = await fetch("/api/admin/create-product", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to create product. ${msg || ""}`);
      return;
    }

    alert("Product created successfully!");
    form.reset();

    // Reset state
    setSelectedAdult([...ADULT_SIZES]);
    setSelectedKid([]);
    setSizeGroup("adult");
    setSelectedBadges([]);
    setImageUrls([]);
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

          {/* Images (upload direto → Blob) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleImagesSelected(e.target.files, e.target)}
              className="block w-full rounded-xl border px-3 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-900"
            />
            <p className="text-xs text-gray-500">
              Files are uploaded directly to storage. The first URL will be the main image.
            </p>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {imageUrls.map((u, i) => (
                  <div key={u} className="rounded-xl border p-1 text-xs">
                    <div className="truncate">{i + 1}. {u.split("/").pop()}</div>
                  </div>
                ))}
              </div>
            )}
            {uploading && <p className="text-xs text-blue-600">Uploading images…</p>}
          </div>

          {/* Badges */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Badges (optional)</label>
            <p className="text-xs text-gray-500">
              Select one or more patches to show on the product page (league, champion, UEFA, etc.).
            </p>

            <div className="space-y-5">
              {BADGE_GROUPS.map((group) => (
                <fieldset key={group.title} className="space-y-2">
                  <legend className="text-xs font-semibold uppercase text-gray-500">
                    {group.title}
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map((opt) => (
                      <label
                        key={opt.value}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={selectedBadges.includes(opt.value)}
                          onChange={() => toggleBadge(opt.value)}
                        />
                          <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
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

            {/* Adult list */}
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

            {/* Kid list */}
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
              disabled={uploading}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900"
            >
              {uploading ? "Uploading…" : "Create Product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
