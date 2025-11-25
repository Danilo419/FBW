// src/app/admin/(panel)/products/new/page.tsx
"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";

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
    items: [
      { value: "club-world-cup-champions", label: "Club World Cup – Champions Badge" },
      { value: "intercontinental-cup-champions", label: "FIFA Intercontinental Cup – Champions Badge" },
    ],
  },
];

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export default function NewProductPage() {
  const [sizeGroup, setSizeGroup] = useState<"adult" | "kid">("adult");

  // ✅ Só mostramos os tamanhos escolhidos.
  const [selectedAdult, setSelectedAdult] = useState<string[]>([...ADULT_SIZES]);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);

  // NOVO: remover completamente o bloco "Customization" no produto
  const [disableCustomization, setDisableCustomization] = useState(false);

  // Badges
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [badgeQuery, setBadgeQuery] = useState("");

  // Images (URLs, ordenáveis)
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ===================== Sizes ===================== */
  function handleSizeGroupChange(e: ChangeEvent<HTMLSelectElement>) {
    const group = e.target.value as "adult" | "kid";
    setSizeGroup(group);
    if (group === "adult") {
      setSelectedAdult((prev) => (prev.length ? prev : [...ADULT_SIZES]));
      setSelectedKid([]);
    } else {
      setSelectedKid((prev) => (prev.length ? prev : [...KID_SIZES]));
      setSelectedAdult([]);
    }
  }

  // Helpers para adicionar/remover
  function addAdult(size: string) {
    setSelectedAdult((prev) => (prev.includes(size) ? prev : [...prev, size]));
  }
  function removeAdult(size: string) {
    setSelectedAdult((prev) => prev.filter((s) => s !== size));
  }
  function addKid(size: string) {
    setSelectedKid((prev) => (prev.includes(size) ? prev : [...prev, size]));
  }
  function removeKid(size: string) {
    setSelectedKid((prev) => prev.filter((s) => s !== size));
  }

  const remainingAdult = useMemo(
    () => ADULT_SIZES.filter((s) => !selectedAdult.includes(s)),
    [selectedAdult]
  );
  const remainingKid = useMemo(
    () => KID_SIZES.filter((s) => !selectedKid.includes(s)),
    [selectedKid]
  );

  /* ===================== Badges ===================== */
  function toggleBadge(value: string) {
    setSelectedBadges((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // Lista achatada para pesquisa
  const ALL_BADGES: (BadgeOption & { group: string })[] = useMemo(() => {
    return BADGE_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.title })));
  }, []);

  const filteredBadges = useMemo(() => {
    const q = badgeQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_BADGES.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.value.toLowerCase().includes(q) ||
        b.group.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [badgeQuery, ALL_BADGES]);

  /* ===================== Images (Cloudinary via /api/upload) ===================== */
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
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          errors.push(`${file.name}: ${data?.error ?? "upload failed"}`);
          continue;
        }

        const url = data.url as string;
        if (!url) {
          errors.push(`${file.name}: missing URL from upload response`);
          continue;
        }

        setImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
      } catch (e: any) {
        errors.push(`${file.name}: ${e?.message ?? "upload failed"}`);
      }
    }

    if (input) input.value = "";
    setUploading(false);

    if (errors.length) {
      alert("Some files failed:\n" + errors.join("\n"));
    }
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    setImageUrls((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const arr = [...prev];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
  }
  function removeAt(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ===================== Submit ===================== */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Sizes – apenas os selecionados são enviados
    formData.append("sizeGroup", sizeGroup);
    const sizes = sizeGroup === "adult" ? selectedAdult : selectedKid;
    sizes.forEach((s) => formData.append("sizes", s));

    // Personalization toggle (NOVO)
    formData.append("disableCustomization", disableCustomization ? "true" : "false");

    // Badges
    selectedBadges.forEach((b) => formData.append("badges", b));

    // Imagens (apenas URLs)
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
    setBadgeQuery("");
    setDisableCustomization(false);
  }

  // ====== Componente reutilizável para gerir tamanhos ======
  function SizesManager({
    title,
    selected,
    all,
    onRemove,
    onAddOne,
    onAddAll,
    onClear,
  }: {
    title: string;
    selected: string[];
    all: string[];
    onRemove: (s: string) => void;
    onAddOne: (s: string) => void;
    onAddAll: () => void;
    onClear: () => void;
  }) {
    const remaining = all.filter((s) => !selected.includes(s));
    const [pick, setPick] = useState<string>("");

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-gray-500">{title}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddAll}
              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-gray-50"
              title="Add all sizes"
            >
              Add all
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
              title="Clear all sizes"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Chips — só tamanhos selecionados */}
        {selected.length === 0 ? (
          <div className="text-xs text-gray-500">No sizes selected.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-white"
                title={`Remove ${s}`}
              >
                {s}
                <button
                  type="button"
                  onClick={() => onRemove(s)}
                  className="rounded-full px-1 text-gray-600 hover:bg-gray-100"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Adicionar um tamanho de volta */}
        <div className="flex items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          >
            <option value="">Add size…</option>
            {remaining.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick}
            onClick={() => {
              if (pick) onAddOne(pick);
              setPick("");
            }}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    );
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
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., Real Madrid Home 25/26"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="team" className="text-sm font-medium">
                Team
              </label>
              <input
                id="team"
                name="team"
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., Real Madrid"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="season" className="text-sm font-medium">
                Season (optional)
              </label>
              <input
                id="season"
                name="season"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g., 25/26"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                Base Price (EUR)
              </label>
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
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Short description..."
            />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleImagesSelected(e.target.files, e.target)}
              className="block w-full rounded-xl border px-3 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-900"
            />
            <p className="text-xs text-gray-500">
              Files are uploaded to cloud storage. The first image is used as the main image. Drag to reorder.
            </p>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageUrls.map((u, i) => (
                  <div
                    key={u}
                    className="group relative rounded-xl border bg-white overflow-hidden"
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex != null) move(dragIndex, i);
                      setDragIndex(null);
                    }}
                    title={u}
                  >
                    <Image
                      src={u}
                      alt={`image ${i + 1}`}
                      unoptimized
                      width={400}
                      height={400}
                      className="aspect-[3/4] w-full object-contain bg.white"
                    />

                    {/* controls */}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => move(i, Math.max(0, i - 1))}
                          className="rounded-md bg-white/90 px-2 text-xs border hover:bg-white"
                          aria-label="Move left"
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            move(i, Math.min(imageUrls.length - 1, i + 1))
                          }
                          className="rounded-md bg-white/90 px-2 text-xs border hover:bg-white"
                          aria-label="Move right"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="rounded-md bg-white/90 px-2 text-xs border hover:bg.white text-red-600"
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        Remove
                      </button>
                    </div>

                    {/* index badge */}
                    <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 text-white text-[11px] px-1.5 py-0.5">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {uploading && <p className="text-xs text-blue-600">Uploading images…</p>}
          </div>

          {/* === NOVO: Personalization (entre Images e Badges) === */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Personalization</label>
            <div className="flex items-start gap-3 rounded-2xl border p-4 bg-white/70">
              <input
                id="disableCustomization"
                type="checkbox"
                checked={disableCustomization}
                onChange={(e) => setDisableCustomization(e.target.checked)}
                className="mt-1"
              />
              <div>
                <label htmlFor="disableCustomization" className="font-medium">
                  Remove “Customization” section on product page
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Use for products without any personalization (no name/number, no “Name &amp; Number + Badge” option).
                  This sets <code>disableCustomization=true</code> in the request; the API creates a{" "}
                  <code>customization</code> option group with <strong>no values</strong>, and the product page will
                  not render that block.
                </p>
              </div>
            </div>
          </div>

          {/* Badges com pesquisa */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Badges (optional)</label>
            <p className="text-xs text-gray-500">
              Type to search patches (league, champion, UEFA, etc.). Selected badges are kept even if they are hidden by
              the filter.
            </p>

            <input
              type="text"
              value={badgeQuery}
              onChange={(e) => setBadgeQuery(e.target.value)}
              placeholder="Search badges…"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />

            {badgeQuery.trim().length === 0 ? (
              <div className="text-xs text-gray-500">Start typing to see available badges.</div>
            ) : filteredBadges.length === 0 ? (
              <div className="text-xs text-gray-500">No badges found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-auto border rounded-xl p-2">
                {filteredBadges.map((opt) => (
                  <label
                    key={opt.value}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
                    title={opt.group}
                  >
                    <input
                      type="checkbox"
                      value={opt.value}
                      checked={selectedBadges.includes(opt.value)}
                      onChange={() => toggleBadge(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {opt.group.split(" – ")[0]}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Selecionados (sempre visíveis) */}
            {selectedBadges.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-gray-500">Selected badges</div>
                <div className="flex flex-wrap gap-2">
                  {selectedBadges.map((val) => {
                    const meta = ALL_BADGES.find((b) => b.value === val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => toggleBadge(val)}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-gray-50"
                        title="Remove"
                      >
                        {meta?.label ?? val}
                        <span aria-hidden>×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Size group selection */}
          <div className="space-y-3">
            <label htmlFor="sizeGroup" className="text-sm font-medium">
              Sizes
            </label>
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
              Only selected sizes are shown below. Removing a size means it won’t exist in the product.
            </p>

            {/* Adult */}
            {sizeGroup === "adult" && (
              <SizesManager
                title="Adult"
                selected={selectedAdult}
                all={ADULT_SIZES}
                onRemove={removeAdult}
                onAddOne={addAdult}
                onAddAll={() => setSelectedAdult([...ADULT_SIZES])}
                onClear={() => setSelectedAdult([])}
              />
            )}

            {/* Kid */}
            {sizeGroup === "kid" && (
              <SizesManager
                title="Kid"
                selected={selectedKid}
                all={KID_SIZES}
                onRemove={removeKid}
                onAddOne={addKid}
                onAddAll={() => setSelectedKid([...KID_SIZES])}
                onClear={() => setSelectedKid([])}
              />
            )}
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
