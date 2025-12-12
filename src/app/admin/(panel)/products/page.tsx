// src/app/admin/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { Search as SearchIcon } from "lucide-react";
import DeleteButton from "./DeleteButton";

/* ---------- helpers ---------- */
function formatMoneyFromCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    (Number.isFinite(cents) ? cents : 0) / 100
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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;

  const q = (sp?.q || "").trim();
  const LIMIT = 10;

  const pageParam = Number(sp?.page ?? "1");
  let page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

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
    },
    skip: (page - 1) * LIMIT,
    take: LIMIT,
  });

  const queryForLink = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    usp.set("page", String(p));
    return `/admin/products?${usp.toString()}`;
  };

  /* ---------- pagination: show only 5 page buttons at a time ---------- */
  const MAX_PAGE_BUTTONS = 5;

  const half = Math.floor(MAX_PAGE_BUTTONS / 2);
  let start = Math.max(1, page - half);
  let end = start + MAX_PAGE_BUTTONS - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - MAX_PAGE_BUTTONS + 1);
  }

  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Products</h1>
            <p className="text-sm text-gray-500">
              Manage your products.{" "}
              {total > 0
                ? `${total} result${total === 1 ? "" : "s"}.`
                : "No results."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form action="/admin/products" method="get" className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search products…"
                className="w-64 rounded-xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Sizes</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-gray-500 text-center">
                    No products found.
                  </td>
                </tr>
              )}

              {products.map((p) => {
                const img = p.imageUrls?.[0] ?? "";
                const availableCount = p.sizes.filter((s) => s.available).length;

                return (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border bg-gray-50">
                        {img ? (
                          <Image
                            src={img}
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

                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{p.team}</td>
                    <td className="py-2 pr-3">{p.season ?? "—"}</td>
                    <td className="py-2 pr-3">{formatMoneyFromCents(p.basePrice)}</td>
                    <td className="py-2 pr-3">
                      {p.sizes.length} ({availableCount} available)
                    </td>

                    <td className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </Link>

                        <DeleteButton
                          id={p.id}
                          name={p.name}
                          action={deleteProductAction}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ---------- pagination ---------- */}
        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-4 flex items-center justify-between gap-3"
          >
            {/* Previous */}
            <div>
              {hasPrev ? (
                <Link
                  href={queryForLink(page - 1)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                  Previous
                </span>
              )}
            </div>

            {/* Page numbers (max 5 visible) */}
            <ul className="flex flex-wrap items-center gap-1">
              {pageNumbers.map((p) =>
                p === page ? (
                  <li key={p}>
                    <span className="inline-flex min-w-9 justify-center rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white">
                      {p}
                    </span>
                  </li>
                ) : (
                  <li key={p}>
                    <Link
                      href={queryForLink(p)}
                      className="inline-flex min-w-9 justify-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {p}
                    </Link>
                  </li>
                )
              )}
            </ul>

            {/* Next */}
            <div>
              {hasNext ? (
                <Link
                  href={queryForLink(page + 1)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
