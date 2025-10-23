// src/app/admin/(panel)/products/new/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

// ===== Size presets =====
const ADULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"]; // XS removido
const KID_SIZES = ["2-3y", "3-4y", "4-5y", "6-7y", "8-9y", "10-11y", "12-13y"];

function toCents(input: string) {
  const normalized = input.replace(",", ".").trim();
  const num = Number(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

async function uniqueSlugFromName(name: string) {
  let base = slugify(name) || "product";
  let candidate = base;
  let i = 0;
  while (true) {
    const exists = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    i += 1;
    const suffix = "-" + crypto.randomUUID().slice(0, 4);
    candidate = (base + suffix).slice(0, 70);
  }
}

async function saveFilesToUploads(files: File[]): Promise<string[]> {
  const outDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(outDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const extFromName = path.extname(file.name || "");
    const ext = extFromName && extFromName.length <= 6 ? extFromName : ".bin";
    const name = `${crypto.randomUUID()}${ext}`;
    const full = path.join(outDir, name);
    await fs.writeFile(full, buf);
    urls.push(`/uploads/${name}`);
  }
  return urls;
}

export default function NewProductPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Create Product</h1>
        <p className="text-sm text-gray-500">Create a new product from scratch.</p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow border">
        <form action={createProductAction} encType="multipart/form-data" className="space-y-6">
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
              <label htmlFor="team" className="text-sm font-medium">Team (required in schema)</label>
              <input
                id="team"
                name="team"
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
            <p className="text-xs text-gray-500">You can select multiple images. The first will be the main image.</p>
          </div>

          {/* === Size group selection === */}
          <div className="space-y-3">
            <label htmlFor="sizeGroup" className="text-sm font-medium">Sizes</label>
            <select
              id="sizeGroup"
              name="sizeGroup"
              defaultValue="adult"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="adult">Adult sizes</option>
              <option value="kid">Kid sizes</option>
            </select>
            <p className="text-xs text-gray-500">
              Only the sizes from the selected group will be saved.
            </p>

            {/* Adult list */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Adult</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ADULT_SIZES.map((s) => (
                  <label key={s} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                    <input type="checkbox" name="sizesAdult" value={s} defaultChecked />
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
                  <label key={s} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
                    <input type="checkbox" name="sizesKid" value={s} />
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

async function createProductAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const teamInput = String(formData.get("team") || "").trim();
  const team: string = teamInput || ""; // schema exige string
  const seasonInput = String(formData.get("season") || "").trim();
  const season: string | undefined = seasonInput || undefined;
  const descriptionInput = String(formData.get("description") || "").trim();
  const description: string | undefined = descriptionInput || undefined;
  const priceStr = String(formData.get("price") || "0");
  const basePrice = toCents(priceStr);

  if (!name || basePrice <= 0) {
    throw new Error("Invalid name or price.");
  }

  const slug = await uniqueSlugFromName(name);

  // Images
  const imagesFiles = formData.getAll("images").filter(Boolean) as File[];
  const imageUrls = await saveFilesToUploads(imagesFiles);

  // Size group + sizes
  const sizeGroup = String(formData.get("sizeGroup") || "adult");
  const sizesAdult = (formData.getAll("sizesAdult") as string[]).map((s) => s.trim());
  const sizesKid = (formData.getAll("sizesKid") as string[]).map((s) => s.trim());

  const picked = (sizeGroup === "kid" ? sizesKid : sizesAdult).filter(Boolean);
  const uniqueSizes = Array.from(new Set(picked));

  if (uniqueSizes.length === 0) {
    throw new Error("Please select at least one size.");
  }

  const product = await prisma.product.create({
    data: {
      slug,
      name,
      team,
      season,
      basePrice,
      images: imageUrls,
      description,
      sizes: {
        create: uniqueSizes.map((size) => ({ size, available: true })),
      },
    },
    select: { id: true },
  });

  redirect(`/admin/products/${product.id}`);
}
