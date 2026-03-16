// src/app/[locale]/admin/(panel)/pt-stock/products/[id]/edit/page.tsx
"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "next/navigation";
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

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_BYTES = 8 * 1024 * 1024;
const PT_STOCK_CHANNEL = "PT_STOCK_CTT";

type ProductPayload = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrls: string[];
  sizes: string[];
  channel: string;
};

export default function EditPTStockProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [sizeGroup, setSizeGroup] = useState<"adult" | "kid">("adult");
  const [selectedAdult, setSelectedAdult] = useState<string[]>([...ADULT_SIZES]);
  const [selectedKid, setSelectedKid] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadProduct() {
      try {
        setLoadingPage(true);
        setNotFound(false);

        const res = await fetch(`/api/admin/products/${id}`, {
          cache: "no-store",
        });

        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.product) {
          throw new Error(data?.error || "Failed to load product.");
        }

        const product = data.product as ProductPayload;

        if (!cancelled) {
          setName(product.name || "");
          setPrice(((product.basePrice ?? 0) / 100).toFixed(2));
          setDescription(product.description || "");
          setImageUrls(Array.isArray(product.imageUrls) ? product.imageUrls : []);

          const sizes = Array.isArray(product.sizes) ? product.sizes : [];
          const hasKid = sizes.some((s) => KID_SIZES.includes(s));
          const hasAdult = sizes.some((s) => ADULT_SIZES.includes(s));

          if (hasKid && !hasAdult) {
            setSizeGroup("kid");
            setSelectedKid(sizes.filter((s) => KID_SIZES.includes(s)));
            setSelectedAdult([]);
          } else {
            setSizeGroup("adult");
            setSelectedAdult(
              sizes.filter((s) => ADULT_SIZES.includes(s)).length
                ? sizes.filter((s) => ADULT_SIZES.includes(s))
                : [...ADULT_SIZES]
            );
            setSelectedKid([]);
          }
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          alert(err?.message || "Failed to load product.");
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

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

    if (!id) return;

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("price", price.trim());
    formData.set("description", description.trim());
    formData.set("channel", PT_STOCK_CHANNEL);
    formData.set("ptStockOnly", "true");
    formData.set("isPtStock", "true");
    formData.set("sizeGroup", sizeGroup);

    const sizes = sizeGroup === "adult" ? selectedAdult : selectedKid;
    sizes.forEach((s) => formData.append("sizes", s));
    imageUrls.forEach((u) => formData.append("imageUrls", u));

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`Failed to update PT Stock product.\n${data?.error || "Unknown error."}`);
        return;
      }

      alert("PT Stock product updated successfully!");
      router.push("/admin/pt-stock/products");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to update product.");
    } finally {
      setSaving(false);
    }
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
            >
              Add all
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
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
              >
                {s}
                <button
                  type="button"
                  onClick={() => onRemove(s)}
                  className="rounded-full px-1 text-gray-600 hover:bg-gray-100"
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

  if (loadingPage) {
    return (
      <div className="max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold md:text-3xl">Edit PT Stock Product</h1>
          <p className="text-sm text-gray-500">Loading product...</p>
        </header>

        <section className="rounded-2xl border bg-white p-6 shadow">
          <div className="text-sm text-gray-600">Loading...</div>
        </section>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold md:text-3xl">Edit PT Stock Product</h1>
          <p className="text-sm text-gray-500">Product not found.</p>
        </header>

        <section className="rounded-2xl border bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              This PT Stock product does not exist or could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => router.push("/admin/pt-stock/products")}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold md:text-3xl">Edit PT Stock Product</h1>
        <p className="text-sm text-gray-500">
          Update a product that appears only in <strong>/pt-stock</strong> (CTT 2–3 business days).
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
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, Math.min(imageUrls.length - 1, i + 1))}
                          className="rounded-md border bg-white/90 px-2 text-xs hover:bg-white"
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="rounded-md border bg-white/90 px-2 text-xs text-red-600 hover:bg-white"
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
              Only selected sizes are shown below. Removing a size means it won’t exist in the product.
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
              disabled={uploading || saving}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {uploading || saving ? "Saving..." : "Save PT Stock Product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}