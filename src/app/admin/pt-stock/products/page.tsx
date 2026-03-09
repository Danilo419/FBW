// src/app/admin/pt-stock/products/page.tsx
"use client";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { useRouter } from "next/navigation";

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

async function deleteProduct(id: string) {
  if (!confirm("Tem certeza que quer eliminar este produto?")) return;

  await fetch(`/api/admin/products/${id}`, {
    method: "DELETE",
  });

  location.reload();
}

export default async function AdminPtStockProductsPage() {
  const router = useRouter();

  const products = await prisma.product.findMany({
    where: {
      channel: "PT_STOCK_CTT" as any,
    },
    select: {
      id: true,
      name: true,
      team: true,
      basePrice: true,
      imageUrls: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            PT Stock • Products
          </h1>
          <p className="text-sm text-gray-600">
            Produtos do canal <b>PT_STOCK_CTT</b> (CTT 2–3 dias úteis).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pt-stock"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Ver página PT Stock →
          </Link>

          <Link
            href="/admin/pt-stock/products/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New PT Stock Product
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Total: <span className="tabular-nums">{products.length}</span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-sm text-gray-600">
            Ainda não tens produtos PT Stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-white sticky top-0">
                <tr className="text-left border-b">
                  <th className="px-4 py-3 font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Team</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0 hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 break-words">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated:{" "}
                        <span className="tabular-nums">
                          {new Date(p.updatedAt).toLocaleString("pt-PT")}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-700 break-words">
                      {p.team || "—"}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                      {formatMoneyRight(p.basePrice)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/pt-stock/products/${p.id}/edit`}
                          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}