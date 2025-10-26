// src/app/admin/(panel)/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { Trash2, Search as SearchIcon } from "lucide-react";

/* ---------- helpers ---------- */
function fmtMoneyFromCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    cents / 100
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ---------- server action: delete product ---------- */
async function deleteProductAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.$transaction(async (tx) => {
    await tx.optionValue.deleteMany({ where: { group: { productId: id } } });
    await tx.optionGroup.deleteMany({ where: { productId: id } });
    await tx.sizeStock.deleteMany({ where: { productId: id } });
    await tx.cartItem.deleteMany({ where: { productId: id } });
    await tx.orderItem.deleteMany({ where: { productId: id } });
    await tx.review.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  revalidatePath("/admin/products");
}

/* ---------- page ---------- */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string };
}) {
  const q = (searchParams?.q || "").trim();
  const LIMIT = 10;
  const pageParam = Number(searchParams?.page ?? "1");
  // calculado depois de ter totalPages; por agora assume 1
  let page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  // filtro simples: procura em name, team, season e slug
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { team: { contains: q, mode: "insensitive" as const } },
          { season: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  page = clamp(page, 1, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      team: true,
      season: true,
      basePrice: true,
      imageUrls: true,
      sizes: { select: { id: true, size: true, available: true } },
      createdAt: true,
      slug: true,
    },
    skip: (page - 1) * LIMIT,
    take: LIMIT,
  });

  const queryForLink = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    usp.set("page", String(p));
    const qs = usp.toString();
    return `/admin/products?${qs}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Products</h1>
            <p className="text-sm text-gray-500">
              Manage your products. {total > 0 ? `${total} result${total === 1 ? "" : "s"}.` : "No results."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search box */}
            <form action="/admin/products" method="get" className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search products…"
                className="w-64 rounded-xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              {/* mantém a página 1 ao pesquisar */}
              <input type="hidden" name="page" value="1" />
            </form>

            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition"
            >
              Create New Product
            </Link>
          </div>
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
                    No products found.
                  </td>
                </tr>
              )}

              {products.map((p) => {
                const mainImageUrl = p.imageUrls?.[0] ?? "";
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

                    <td className="py-2 pr-0">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </Link>

                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            title="Delete product"
                            aria-label={`Delete ${p.name}`}
                            className="inline-flex items-center justify-center rounded-xl border px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(e) => {
                              if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <Link
                  key={p}
                  href={queryForLink(p)}
                  className={`min-w-[2rem] text-center rounded-lg border px-2.5 py-1.5 text-sm ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:bg-gray-50"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
