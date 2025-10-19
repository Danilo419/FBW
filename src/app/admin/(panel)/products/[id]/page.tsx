// src/app/admin/(panel)/products/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateProduct } from "@/app/admin/(panel)/products/actions";
import SizeAvailabilityToggle from "@/app/admin/(panel)/products/SizeAvailabilityToggle";
import ImagesEditor from "@/app/admin/(panel)/products/ImagesEditor";
import type { OptionType } from "@prisma/client";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

// ordem sugerida (adulto primeiro; depois kids)
const SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  // kids (idades)
  "2-3Y",
  "3-4Y",
  "4-5Y",
  "6-7Y",
  "8-9Y",
  "10-11Y",
  "12-13Y",
];

function normalizeSize(s: string) {
  return s.trim().toUpperCase();
}

function sizeComparator(a: string, b: string) {
  const A = normalizeSize(a);
  const B = normalizeSize(b);
  const ia = SIZE_ORDER.indexOf(A);
  const ib = SIZE_ORDER.indexOf(B);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return A.localeCompare(B);
}

export default async function ProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      sizes: true, // tem { id, productId, size, available }
      options: {
        where: { type: "SIZE" as OptionType },
        include: { values: { select: { value: true, label: true } } },
      },
    },
  });
  if (!product) return notFound();

  // --- Determinar quais tamanhos são válidos para ESTE produto ---
  const sizeGroup = product.options[0]; // se houver múltiplos grupos SIZE, usa o primeiro
  const allowedSizesSet =
    sizeGroup && sizeGroup.values.length > 0
      ? new Set(
          sizeGroup.values
            .map((v) => normalizeSize(v.label || v.value))
            .filter(Boolean)
        )
      : null;

  // Filtra e ordena os SizeStock exibidos
  const viewSizes = product.sizes
    .filter((s) =>
      allowedSizesSet ? allowedSizesSet.has(normalizeSize(s.size)) : true
    )
    .sort((a, b) => sizeComparator(a.size, b.size));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Edit product</h1>
        <p className="text-sm text-gray-500">
          Update general information, images and size availability.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <form action={updateProduct} className="grid gap-6">
          <input type="hidden" name="id" defaultValue={product.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Name</label>
              <input
                name="name"
                defaultValue={product.name}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Team</label>
              <input
                name="team"
                defaultValue={product.team}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Season</label>
              <input
                name="season"
                defaultValue={product.season ?? ""}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="e.g. 25/26"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">
                Base price (EUR)
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={centsToInput(product.basePrice)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={product.description ?? ""}
                className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
                placeholder="Product description..."
              />
            </div>
          </div>

          {/* Editor de Imagens (drag, add, remove, reorder). Submete `imagesText` */}
          <ImagesEditor
            name="imagesText"
            initialImages={product.images ?? []}
            alt={product.name}
          />

          <div>
            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Save product
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Sizes & Availability</h3>
          {allowedSizesSet && (
            <span className="text-xs text-gray-500">
              Showing {viewSizes.length} of {product.sizes.length} sizes (based on
              product size options)
            </span>
          )}
        </div>

        {viewSizes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No sizes to show. Add size options to this product or create size
            entries only for the sizes you sell.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {viewSizes.map((s) => {
              const unavailable = !s.available; // ✅ booleano
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                    unavailable ? "bg-red-50" : "bg-green-50"
                  }`}
                >
                  <div
                    className={`font-semibold ${
                      unavailable ? "line-through opacity-50" : ""
                    }`}
                  >
                    {s.size}
                  </div>
                  <SizeAvailabilityToggle
                    sizeId={s.id}
                    initialUnavailable={unavailable}
                  />
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Toggling <strong>Unavailable</strong> simply turns the size off (no
          quantity tracking).
        </p>
      </section>
    </div>
  );
}
