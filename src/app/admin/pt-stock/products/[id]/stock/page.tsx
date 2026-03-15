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
    },
  });

  if (!product) {
    notFound();
  }

  const currentStock = product.ptStockQty ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">PT Stock</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Update the available Portugal stock for this product.
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
        <div className="mb-6">
          <h2 className="text-xl font-bold">{product.name}</h2>

          <p className="mt-1 text-sm text-neutral-500">
            ID: {product.id}
          </p>

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
            Price: <span className="font-semibold text-black">{formatMoneyRight(product.basePrice)}</span>
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Updated:{" "}
            <span className="tabular-nums font-semibold text-black">
              {new Date(product.updatedAt).toLocaleString("en-GB")}
            </span>
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            Current stock:{" "}
            <span className="font-semibold text-black">{currentStock}</span>
          </p>
        </div>

        <form action={updatePtStockQuantity} className="space-y-5">
          <input type="hidden" name="productId" value={product.id} />

          <div className="space-y-2">
            <label
              htmlFor="ptStockQty"
              className="block text-sm font-semibold text-neutral-800"
            >
              Stock quantity
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
              Enter how many units you currently have available in Portugal.
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