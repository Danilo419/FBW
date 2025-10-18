export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateProduct } from "@/app/admin/(panel)/products/actions";
import SizeAvailabilityToggle from "@/app/admin/(panel)/products/SizeAvailabilityToggle";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function ProductEditPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { sizes: { orderBy: { size: "asc" } } },
  });
  if (!product) return notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Edit product</h1>
        <p className="text-sm text-gray-500">Update general information and size availability.</p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <form action={updateProduct} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" defaultValue={product.id} />
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
            <label className="text-xs font-medium text-gray-600">Base price (EUR)</label>
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
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              name="description"
              defaultValue={product.description ?? ""}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
              placeholder="Product description..."
            />
          </div>

          <div className="col-span-2">
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
        <h3 className="font-semibold mb-3">Sizes & Availability</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {product.sizes.map((s) => {
            const unavailable = (s.stock ?? 0) <= 0;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  unavailable ? "bg-red-50" : "bg-green-50"
                }`}
              >
                <div className={`font-semibold ${unavailable ? "line-through opacity-50" : ""}`}>
                  {s.size}
                </div>
                <SizeAvailabilityToggle sizeId={s.id} initialUnavailable={unavailable} />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Toggling <strong>Unavailable</strong> sets <code>stock = 0</code>. Toggling back to{" "}
          <strong>Available</strong> restores stock to a small default (configurable).
        </p>
      </section>
    </div>
  );
}
