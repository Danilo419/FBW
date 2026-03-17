import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePtStockQuantity } from "./actions";
import { formatMoney } from "@/lib/money";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

function sortSizes(a: string, b: string) {
  const order = [
    "2-3y",
    "3-4y",
    "4-5y",
    "5-6y",
    "6-7y",
    "7-8y",
    "8-9y",
    "9-10y",
    "10-11y",
    "11-12y",
    "12-13y",
    "13-14y",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "2XL",
    "3XL",
    "4XL",
  ];

  const ai = order.indexOf(a);
  const bi = order.indexOf(b);

  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;

  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

export default async function AdminPtStockProductStockPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ptStockQty: true,
      basePrice: true,
      slug: true,
      team: true,
      channel: true,
      updatedAt: true,
      sizes: {
        select: {
          id: true,
          size: true,
          available: true,
          ptStockQty: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const sizes = [...(product.sizes ?? [])].sort((a, b) => sortSizes(a.size, b.size));
  const currentStock = product.ptStockQty ?? 0;
  const totalBySizes = sizes.reduce((sum, size) => sum + (size.ptStockQty ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">PT Stock</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Update the available Portugal stock for this product and for each size.
          </p>
        </div>

        <Link
          href={"/admin/pt-stock/products" as Route}
          className="inline-flex h-11 items-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold transition hover:bg-neutral-50"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-3xl border border-neutral-300 bg-white p-6 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{product.name}</h2>

          <p className="mt-1 text-sm text-neutral-500">ID: {product.id}</p>

          <p className="mt-1 text-sm text-neutral-500">
            Slug: {product.slug}
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Team: {product.team || "—"}
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Channel: <span className="font-semibold text-black">{product.channel}</span>
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Price:{" "}
            <span className="font-semibold text-black">
              {formatMoneyRight(product.basePrice)}
            </span>
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Updated:{" "}
            <span className="tabular-nums font-semibold text-black">
              {new Date(product.updatedAt).toLocaleString("en-GB")}
            </span>
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            Current total stock:{" "}
            <span className="font-semibold text-black">{currentStock}</span>
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Sum of size stock:{" "}
            <span className="font-semibold text-black">{totalBySizes}</span>
          </p>
        </div>

        <form action={updatePtStockQuantity} className="space-y-8">
          <input type="hidden" name="productId" value={product.id} />

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Stock by size</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Set the available quantity for each size. You can also mark sizes as available
                or unavailable.
              </p>
            </div>

            {sizes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                This product has no sizes configured yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200">
                <div className="grid grid-cols-[100px_140px_1fr] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">
                  <div>Size</div>
                  <div>Available</div>
                  <div>Quantity</div>
                </div>

                <div className="divide-y divide-neutral-200">
                  {sizes.map((size) => (
                    <div
                      key={size.id}
                      className="grid grid-cols-[100px_140px_1fr] items-center gap-4 px-4 py-4"
                    >
                      <div className="font-semibold text-black">{size.size}</div>

                      <div className="flex items-center gap-3">
                        <input type="hidden" name="sizeIds" value={size.id} />

                        <input
                          id={`available_${size.id}`}
                          name={`available_${size.id}`}
                          type="checkbox"
                          defaultChecked={size.available}
                          className="h-4 w-4 rounded border-neutral-300"
                        />

                        <label
                          htmlFor={`available_${size.id}`}
                          className="text-sm text-neutral-700"
                        >
                          Yes
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          name={`sizeStock_${size.id}`}
                          type="number"
                          min={0}
                          defaultValue={size.ptStockQty ?? 0}
                          className="h-11 w-36 rounded-xl border border-neutral-300 px-3 outline-none transition focus:border-black"
                          required
                        />

                        <span className="text-sm text-neutral-500">units available</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="ptStockQty"
              className="block text-sm font-semibold text-neutral-800"
            >
              Total stock
            </label>

            <input
              id="ptStockQty"
              name="ptStockQty"
              type="number"
              min={0}
              defaultValue={currentStock}
              className="h-12 w-full rounded-2xl border border-neutral-300 px-4 text-base outline-none transition focus:border-black"
              required
            />

            <p className="text-sm text-neutral-500">
              Recommended: keep this equal to the sum of all size quantities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-12 items-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Save stock
            </button>

            <Link
              href={"/admin/pt-stock/products" as Route}
              className="inline-flex h-12 items-center rounded-2xl border border-neutral-300 px-5 text-sm font-semibold transition hover:bg-neutral-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}