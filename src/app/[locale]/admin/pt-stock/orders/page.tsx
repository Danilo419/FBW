// src/app/[locale]/admin/pt-stock/orders/page.tsx
import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import ResolveCheckbox from "@/components/admin/ResolveCheckbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";

/* ============================ Config ============================ */
const PAGE_SIZE = 20;

/* ---------- helpers ---------- */
function formatMoneyRight(cents: number) {
  const euros = Number(cents ?? 0) / 100;

  const s = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(euros);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

function getOrderTotalCents(order: {
  totalCents?: number | null;
  subtotal?: number | null;
  shipping?: number | null;
  tax?: number | null;
}) {
  if (typeof order.totalCents === "number" && !Number.isNaN(order.totalCents)) {
    return order.totalCents;
  }

  return (
    Number(order.subtotal ?? 0) +
    Number(order.shipping ?? 0) +
    Number(order.tax ?? 0)
  );
}

/* ---------- paid PT Stock filter ---------- */
const ptStockPaidWhere: Prisma.OrderWhereInput = {
  channel: "PT_STOCK_CTT" as any,
  OR: [
    { status: "paid" },
    { paidAt: { not: null } },
    {
      paymentStatus: {
        in: ["PAID", "SUCCEEDED", "COMPLETED", "CAPTURED", "SETTLED"],
      },
    },
  ],
};

/* ---------- select ---------- */
const orderSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  paidAt: true,
  createdAt: true,

  totalCents: true,
  subtotal: true,
  shipping: true,
  tax: true,

  shippingFullName: true,
  shippingEmail: true,
  shippingStatus: true,

  items: {
    select: {
      id: true,
      name: true,
      qty: true,
      unitPrice: true,
      image: true,
    },
  },
} as const;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/* ---------- server actions ---------- */
async function deleteOrderAction(formData: FormData): Promise<void> {
  "use server";

  const orderId = String(formData.get("orderId") ?? "").trim();
  const page = String(formData.get("page") ?? "1").trim();
  const locale = String(formData.get("locale") ?? "pt").trim();

  if (!orderId) return;

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath(`/${locale}/admin/pt-stock/orders`);
  revalidatePath(`/${locale}/admin/orders/${orderId}`);

  redirect(`/${locale}/admin/pt-stock/orders?page=${encodeURIComponent(page || "1")}`);
}

/* ---------- page ---------- */
type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function AdminPtStockOrdersPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};

  const rawPage = (sp.page ?? "1").toString();
  const currentPage = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where: ptStockPaidWhere }),
    prisma.order.findMany({
      where: ptStockPaidWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: orderSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (currentPage > totalPages) {
    redirect(`/${locale}/admin/pt-stock/orders?page=${totalPages}`);
  }

  const windowSize = 7;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold md:text-3xl">PT Stock Orders</h1>
            <p className="text-sm text-gray-500">
              Showing only paid orders from Portugal Delivery (CTT). ({totalCount} total)
            </p>
          </div>

          <Link
            href="/pt-stock"
            locale={locale}
            className="inline-flex items-center rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            View PT Stock page →
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Full name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Shipping</th>
                <th className="py-2 pr-3">Resolve</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={8}>
                    There are no paid PT Stock orders yet.
                  </td>
                </tr>
              )}

              {orders.map((order: OrderRow) => {
                const totalCents = getOrderTotalCents(order);
                const itemCount = order.items.reduce(
                  (acc, it) => acc + Number(it.qty ?? 0),
                  0
                );

                const itemPreview = order.items
                  .slice(0, 2)
                  .map((it) => it.name)
                  .join(", ");

                const isResolved = (order?.status || "").toUpperCase() === "RESOLVED";

                let shippingLabel = "Pending";
                let shippingClass =
                  "border-gray-200 bg-gray-50 text-gray-700";

                if (order.shippingStatus === "DELIVERED") {
                  shippingLabel = "Delivered";
                  shippingClass =
                    "border-emerald-200 bg-emerald-50 text-emerald-800";
                } else if (order.shippingStatus === "SHIPPED") {
                  shippingLabel = "Shipped";
                  shippingClass = "border-blue-200 bg-blue-50 text-blue-800";
                } else if (order.shippingStatus === "PROCESSING") {
                  shippingLabel = "Processing";
                  shippingClass =
                    "border-yellow-200 bg-yellow-50 text-yellow-800";
                }

                return (
                  <tr key={order.id} className="align-top border-b bg-yellow-50 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 font-mono">
                      {order.id}
                    </td>

                    <td className="py-2 pr-3">
                      {order.shippingFullName?.trim() || "—"}
                    </td>

                    <td className="py-2 pr-3">
                      {order.shippingEmail?.trim() || "—"}
                    </td>

                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-900">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </div>
                      <div className="max-w-[260px] truncate text-xs text-gray-500">
                        {itemPreview || "—"}
                        {order.items.length > 2 ? "…" : ""}
                      </div>
                    </td>

                    <td className="py-2 pr-3 font-semibold text-gray-900">
                      {formatMoneyRight(totalCents)}
                    </td>

                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${shippingClass}`}
                      >
                        {shippingLabel}
                      </span>
                    </td>

                    <td className="py-2 pr-3">
                      <ResolveCheckbox
                        orderId={order.id}
                        initialResolved={isResolved}
                        initialStatus={order?.status || "pending"}
                      />
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          locale={locale}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          aria-label={`View order ${order.id}`}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>

                        <form action={deleteOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="page" value={String(currentPage)} />
                          <input type="hidden" name="locale" value={locale} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                            aria-label={`Delete order ${order.id}`}
                            title="Delete order"
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
              <span className="font-semibold text-gray-700">{totalPages}</span>
            </div>

            <nav className="flex items-center gap-1">
              <Link
                href={`/admin/pt-stock/orders?page=${Math.max(1, currentPage - 1)}`}
                locale={locale}
                aria-disabled={currentPage === 1}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs hover:bg-gray-50 ${
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }`}
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Link>

              {start > 1 && (
                <>
                  <Link
                    href="/admin/pt-stock/orders?page=1"
                    locale={locale}
                    className="inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    1
                  </Link>
                  {start > 2 && <span className="px-1 text-gray-400">…</span>}
                </>
              )}

              {pages.map((p) => (
                <Link
                  key={p}
                  href={`/admin/pt-stock/orders?page=${p}`}
                  locale={locale}
                  className={`inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    p === currentPage
                      ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-900"
                      : ""
                  }`}
                  aria-current={p === currentPage ? "page" : undefined}
                >
                  {p}
                </Link>
              ))}

              {end < totalPages && (
                <>
                  {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
                  <Link
                    href={`/admin/pt-stock/orders?page=${totalPages}`}
                    locale={locale}
                    className="inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    {totalPages}
                  </Link>
                </>
              )}

              <Link
                href={`/admin/pt-stock/orders?page=${Math.min(totalPages, currentPage + 1)}`}
                locale={locale}
                aria-disabled={currentPage === totalPages}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs hover:bg-gray-50 ${
                  currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                }`}
                title="Next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}