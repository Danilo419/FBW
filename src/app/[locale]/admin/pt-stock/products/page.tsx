// src/app/[locale]/admin/pt-stock/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Search as SearchIcon, Eye, EyeOff, Trash2 } from "lucide-react";

/* ---------- helpers ---------- */
function formatMoneyFromCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    (Number.isFinite(cents) ? cents : 0) / 100
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function getImageFromImageUrls(imageUrls: unknown) {
  try {
    if (!imageUrls) return "";

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first);
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "";

      if (s.startsWith("[")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first);
        }
      }

      return normalizeUrl(s);
    }

    return "";
  } catch {
    return "";
  }
}

/* ---------- server action: toggle visible/invisible ---------- */
async function toggleVisibilityAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const locale = String(formData.get("locale") || "pt").trim() || "pt";
  const q = String(formData.get("q") || "").trim();
  const page = String(formData.get("page") || "1").trim() || "1";

  if (!id) return;

  const current = String(formData.get("isVisible") || "");
  const isVisibleNow = current === "1" || current === "true";
  const next = !isVisibleNow;

  await prisma.product.update({
    where: { id },
    data: { isVisible: next },
    select: { id: true },
  });

  revalidatePath(`/${locale}/admin/pt-stock/products`);

  const usp = new URLSearchParams();
  if (q) usp.set("q", q);
  usp.set("page", page);

  redirect(`/${locale}/admin/pt-stock/products?${usp.toString()}`);
}

/* ---------- server action: delete product ---------- */
async function deletePtStockProductAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const locale = String(formData.get("locale") || "pt").trim() || "pt";
  const q = String(formData.get("q") || "").trim();
  const page = String(formData.get("page") || "1").trim() || "1";

  if (!id) {
    throw new Error("Invalid product id.");
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, channel: true },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  if (product.channel !== "PT_STOCK_CTT") {
    throw new Error("Only PT Stock products can be deleted here.");
  }

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath(`/${locale}/admin/pt-stock/products`);
  revalidatePath(`/${locale}/pt-stock`);

  const usp = new URLSearchParams();
  if (q) usp.set("q", q);
  usp.set("page", page);

  redirect(`/${locale}/admin/pt-stock/products?${usp.toString()}`);
}

/* ---------- page ---------- */
export default async function AdminPtStockProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const q = (sp?.q || "").trim();
  const LIMIT = 10;

  const pageParam = Number(sp?.page ?? "1");
  let page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const where = {
    channel: "PT_STOCK_CTT" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { team: { contains: q, mode: "insensitive" as const } },
            { season: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  page = clamp(page, 1, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      team: true,
      season: true,
      basePrice: true,
      ptStockQty: true,
      imageUrls: true,
      createdAt: true,
      isVisible: true,
    },
    skip: (page - 1) * LIMIT,
    take: LIMIT,
  });

  const queryForLink = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    usp.set("page", String(p));
    return `/admin/pt-stock/products?${usp.toString()}`;
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
            <h1 className="text-2xl font-extrabold md:text-3xl">PT Stock Products</h1>
            <p className="text-sm text-gray-500">
              Manage your PT Stock products.{" "}
              {total > 0 ? `${total} result${total === 1 ? "" : "s"}.` : "No results."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form action={`/${locale}/admin/pt-stock/products`} method="get" className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search products…"
                className="w-64 rounded-xl border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="hidden" name="page" value="1" />
            </form>

            <Link
              href="/admin/pt-stock/products/new"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900"
            >
              Create New Product
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3">Image</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}

              {products.map((p) => {
                const img = getImageFromImageUrls(p.imageUrls);
                const stockQty = p.ptStockQty ?? 0;
                const isVisible = !!p.isVisible;
                const viewHref = `/pt-stock/${p.slug}`;
                const editHref = `/admin/pt-stock/products/${p.id}/edit`;
                const stockHref = `/admin/pt-stock/products/${p.id}/stock`;

                return (
                  <tr key={p.id} className="align-top border-b last:border-0">
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
                    <td className="py-2 pr-3">{p.team || "—"}</td>
                    <td className="py-2 pr-3">{p.season ?? "—"}</td>
                    <td className="py-2 pr-3">{formatMoneyFromCents(p.basePrice)}</td>

                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          stockQty <= 0
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : stockQty <= 3
                              ? "border border-orange-200 bg-orange-50 text-orange-700"
                              : "border border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {stockQty} unit{stockQty === 1 ? "" : "s"}
                      </span>
                    </td>

                    <td className="py-2 pr-3">
                      {isVisible ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <Eye className="h-3.5 w-3.5" />
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                          <EyeOff className="h-3.5 w-3.5" />
                          Hidden
                        </span>
                      )}
                    </td>

                    <td className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={viewHref}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          View
                        </Link>

                        <Link
                          href={editHref}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </Link>

                        <Link
                          href={stockHref}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          Stock
                        </Link>

                        <form action={toggleVisibilityAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="q" value={q} />
                          <input type="hidden" name="page" value={String(page)} />
                          <input type="hidden" name="isVisible" value={isVisible ? "1" : "0"} />
                          <button
                            type="submit"
                            className={
                              isVisible
                                ? "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                                : "inline-flex items-center gap-1 rounded-xl border bg-black px-3 py-1.5 text-xs text-white hover:bg-gray-900"
                            }
                            title={isVisible ? "Hide product" : "Make product visible"}
                          >
                            {isVisible ? (
                              <>
                                <EyeOff className="h-4 w-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                Show
                              </>
                            )}
                          </button>
                        </form>

                        <form action={deletePtStockProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="q" value={q} />
                          <input type="hidden" name="page" value={String(page)} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
            <div>
              {hasPrev ? (
                <Link
                  href={queryForLink(page - 1)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-lg border px-3 py-1.5 text-sm text-gray-400">
                  Previous
                </span>
              )}
            </div>

            <ul className="flex flex-wrap items-center gap-1">
              {pageNumbers.map((pn) =>
                pn === page ? (
                  <li key={pn}>
                    <span className="inline-flex min-w-9 justify-center rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white">
                      {pn}
                    </span>
                  </li>
                ) : (
                  <li key={pn}>
                    <Link
                      href={queryForLink(pn)}
                      className="inline-flex min-w-9 justify-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {pn}
                    </Link>
                  </li>
                )
              )}
            </ul>

            <div>
              {hasNext ? (
                <Link
                  href={queryForLink(page + 1)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-lg border px-3 py-1.5 text-sm text-gray-400">
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