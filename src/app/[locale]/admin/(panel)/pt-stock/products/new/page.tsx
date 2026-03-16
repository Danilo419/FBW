// src/app/[locale]/admin/(panel)/pt-stock/products/new/page.tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

const ADULT_SIZES = ["S", "M", "L", "XL", "2XL"];
const KID_SIZES = [
  "2-3y",
  "3-4y",
  "4-5y",
  "4-5y",
  "6-7y",
  "8-9y",
  "10-11y",
  "12-13y",
].filter((v, i, a) => a.indexOf(v) === i);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;
const PT_STOCK_CHANNEL = "PT_STOCK_CTT";

export default function NewPTStockProductPage() {
  const router = useRouter();

  const [sizeGroup, setSizeGroup] = useState<"adult" | "kid">("adult");
  const [selectedAdult, setSelectedAdult] = useState<string[]>([...ADULT_SIZES]);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

        const data = await res.json().catch(() => ({} as any));

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

  function move(from: number, to: number) {
    setImageUrls((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function removeAt(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("channel", PT_STOCK_CHANNEL);
    formData.set("ptStockOnly", "true");
    formData.set("isPtStock", "true");
    formData.set("sizeGroup", sizeGroup);

    const sizes = sizeGroup === "adult" ? selectedAdult : selectedKid;
    sizes.forEach((s) => formData.append("sizes", s));

    imageUrls.forEach((u) => formData.append("imageUrls", u));
    formData.delete("images");

    const res = await fetch("/api/admin/create-product", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const msg = data?.error || "Failed to create product.";
      alert(`Failed to create PT Stock product.\n${msg}`);
      return;
    }

    alert("PT Stock product created successfully!");
    router.push("/admin/pt-stock/products");
    router.refresh();
  }

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
    const [pick, setPick] = useState("");

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

        {selected.length === 0 ? (
          <div className="text-xs text-gray-500">No sizes selected.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs"
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
        <h1 className="text-2xl font-extrabold md:text-3xl">Create PT Stock Product</h1>
        <p className="text-sm text-gray-500">
          Products created here will appear only in <strong>/pt-stock</strong> (CTT 2–3 business days).
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-6 shadow">
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
                placeholder="e.g., Benfica Home 24/25"
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
                placeholder="e.g., 29.99"
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imageUrls.map((u, i) => (
                  <motion.div
                    key={u}
                    className="group relative overflow-hidden rounded-xl border bg-white"
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex != null) move(dragIndex, i);
                      setDragIndex(null);
                    }}
                    title={u}
                    whileHover={{ y: -2 }}
                  >
                    <Image
                      src={u}
                      alt={`image ${i + 1}`}
                      unoptimized
                      width={400}
                      height={400}
                      className="aspect-[3/4] w-full object-contain bg-white"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5 opacity-0 transition group-hover:opacity-100">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => move(i, Math.max(0, i - 1))}
                          className="rounded-md border bg-white/90 px-2 text-xs hover:bg-white"
                          aria-label="Move left"
                          title="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, Math.min(imageUrls.length - 1, i + 1))}
                          className="rounded-md border bg-white/90 px-2 text-xs hover:bg-white"
                          aria-label="Move right"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="rounded-md border bg-white/90 px-2 text-xs text-red-600 hover:bg-white"
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                      {i + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {uploading && <p className="text-xs text-blue-600">Uploading images…</p>}
          </div>

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
              Only selected sizes are shown below. Removing a size means it will not exist in the product.
            </p>

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
            <button
              type="button"
              onClick={() => router.push("/admin/pt-stock/products")}
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Create PT Stock Product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}