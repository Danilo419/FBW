// src/app/admin/(panel)/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

function fmtMoneyFromCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    cents / 100
  );
}

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      team: true,
      season: true,
      basePrice: true,
      imageUrls: true, // 👈 mudou de images -> imageUrls
      sizes: { select: { id: true, size: true, available: true } },
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Products</h1>
            <p className="text-sm text-gray-500">List of all store products.</p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition"
          >
            Create New Product
          </Link>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Image</th>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2 pr-3">Base price</th>
                <th className="py-2 pr-3">Sizes</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={8}>
                    No products yet.
                  </td>
                </tr>
              )}
              {products.map((p) => {
                const mainImageUrl = p.imageUrls?.[0] ?? ""; // 👈 usa imageUrls[0]
                const availableCount = p.sizes.filter((s) => s.available).length;

                return (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border bg-gray-50">
                        {mainImageUrl ? (
                          <Image
                            src={mainImageUrl}
                            alt={p.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center text-[10px] text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{p.id}</td>
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{p.team}</td>
                    <td className="py-2 pr-3">{p.season ?? "—"}</td>
                    <td className="py-2 pr-3">{fmtMoneyFromCents(p.basePrice, "EUR")}</td>
                    <td className="py-2 pr-3">
                      {p.sizes.length} sizes
                      {p.sizes.length > 0 && (
                        <span className="text-gray-400"> ({availableCount} available)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
