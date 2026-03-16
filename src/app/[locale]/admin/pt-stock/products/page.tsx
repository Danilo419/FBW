// src/app/[locale]/admin/pt-stock/products/page.tsx
import { Link } from "@/i18n/navigation";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import DeletePtStockProductButton from "./DeletePtStockProductButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

export default async function AdminPtStockProductsPage() {
  const products = await prisma.product.findMany({
    where: {
      channel: "PT_STOCK_CTT" as const,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      basePrice: true,
      ptStockQty: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">PT Stock • Products</h1>
          <p className="text-sm text-gray-600">
            Products from the <b>PT_STOCK_CTT</b> channel (CTT 2–3 business days).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={"/pt-stock" as Route}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            View PT Stock page →
          </Link>

          <Link
            href={"/admin/pt-stock/products/new" as Route}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New PT Stock Product
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">
            Total: <span className="tabular-nums">{products.length}</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-sm text-gray-600">
            You do not have any PT Stock products yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Team</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Stock</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => {
                  const stockQty = p.ptStockQty ?? 0;
                  const viewHref = `/pt-stock/${p.slug}` as Route;
                  const editHref = `/admin/pt-stock/products/${p.id}/edit` as Route;
                  const stockHref = `/admin/pt-stock/products/${p.id}/stock` as Route;

                  return (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="break-words font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          Updated:{" "}
                          <span className="tabular-nums">
                            {new Date(p.updatedAt).toLocaleString("en-GB")}
                          </span>
                        </div>
                      </td>

                      <td className="break-words px-4 py-3 text-gray-700">{p.team || "—"}</td>

                      <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">
                        {formatMoneyRight(p.basePrice)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            stockQty <= 0
                              ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                              : stockQty <= 3
                                ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200"
                                : "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
                          }`}
                        >
                          {stockQty} unit{stockQty === 1 ? "" : "s"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={viewHref}
                            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                          >
                            View
                          </Link>

                          <Link
                            href={editHref}
                            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                          >
                            Edit
                          </Link>

                          <Link
                            href={stockHref}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Stock
                          </Link>

                          <DeletePtStockProductButton productId={p.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}