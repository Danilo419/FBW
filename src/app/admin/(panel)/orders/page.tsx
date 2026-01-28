// src/app/admin/(panel)/orders/page.tsx
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import ResolveCheckbox from "@/components/admin/ResolveCheckbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* ============================ Config ============================ */
const PAGE_SIZE = 20;

/* ---------- helpers ---------- */
function fmtMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

/** Heurística robusta para normalizar total (euros vs. cêntimos) */
function normalizeTotal(o: any): number {
  if (typeof o.totalCents === "number" && !Number.isNaN(o.totalCents)) {
    return o.totalCents / 100;
  }

  if (typeof o.total === "number" && !Number.isNaN(o.total)) {
    const t = o.total;

    if (t >= 1000) return t / 100;

    const hasParts =
      typeof o.subtotal === "number" ||
      typeof o.shipping === "number" ||
      typeof o.tax === "number";
    if (!hasParts && Number.isInteger(t) && t % 100 === 0) {
      return t / 100;
    }

    const parts = [o.subtotal, o.shipping, o.tax].filter(
      (x) => typeof x === "number"
    ) as number[];
    const looksLikeCents =
      parts.length > 0 &&
      parts.filter((p) => p >= 1000 || (Number.isInteger(p) && p % 100 === 0)).length >=
        Math.ceil(parts.length / 2);

    if (looksLikeCents) return t / 100;

    return t;
  }

  const parts = [Number(o.subtotal ?? 0), Number(o.shipping ?? 0), Number(o.tax ?? 0)];
  return parts
    .map((p) => {
      if (Number.isNaN(p)) return 0;
      if (p >= 1000) return p / 100;
      if (Number.isInteger(p) && p % 100 === 0 && p !== 0) return p / 100;
      return p;
    })
    .reduce((a, b) => a + b, 0);
}

/* ---------- shipping utils ---------- */
function safeParseJSON(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as Record<string, any>;
  return {};
}

function getDeep(obj: any, paths: string[][]): string | undefined {
  for (const p of paths) {
    let cur: any = obj;
    for (const k of p) {
      if (cur && typeof cur === "object" && k in cur) cur = cur[k];
      else {
        cur = undefined;
        break;
      }
    }
    if (cur != null) {
      const s = String(cur).trim();
      if (s !== "") return s;
    }
  }
  return undefined;
}

function fromOrder(order: any) {
  if (order.shippingFullName || order.shippingEmail) {
    return {
      fullName: order.shippingFullName ?? order?.user?.name ?? null,
      email: order.shippingEmail ?? order?.user?.email ?? null,
    };
  }

  const j = safeParseJSON(order?.shippingJson);
  const candidates = (keys: string[]) =>
    [keys, ["shipping", ...keys], ["address", ...keys], ["delivery", ...keys]] as string[][];

  return {
    fullName:
      getDeep(j, candidates(["fullName"])) ??
      getDeep(j, candidates(["name"])) ??
      getDeep(j, candidates(["recipient"])) ??
      order?.user?.name ??
      null,
    email: getDeep(j, candidates(["email"])) ?? order?.user?.email ?? null,
  };
}

/* ---------- paid filter (server-side) ---------- */
const paidWhere: Prisma.OrderWhereInput = {
  OR: [
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

  currency: true,
  subtotal: true,
  shipping: true,
  tax: true,
  total: true,
  totalCents: true,

  shippingFullName: true,
  shippingEmail: true,
  shippingJson: true,
  user: { select: { name: true, email: true } },
} as const;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/* ---------- server actions ---------- */
async function deleteOrderAction(formData: FormData): Promise<void> {
  "use server";

  const orderId = String(formData.get("orderId") ?? "").trim();
  const page = String(formData.get("page") ?? "1").trim();

  if (!orderId) return;

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  redirect(`/admin/orders?page=${encodeURIComponent(page || "1")}`);
}

/* ---------- page ---------- */
type PageProps = {
  // ✅ Next 15 types in your project expect searchParams as Promise
  searchParams?: Promise<{ page?: string }>;
};

export default async function OrdersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawPage = (sp.page ?? "1").toString();
  const currentPage = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where: paidWhere }),
    prisma.order.findMany({
      where: paidWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: orderSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // se o user meter ?page=999 e não existir, mandamos para a última válida
  if (currentPage > totalPages) {
    redirect(`/admin/orders?page=${totalPages}`);
  }

  // janela de paginação (ex: mostra 7 páginas)
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
        <h1 className="text-2xl md:text-3xl font-extrabold">Orders</h1>
        <p className="text-sm text-gray-500">
          Showing only paid orders. ({totalCount} total)
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Full name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Resolve</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={7}>
                    No paid orders found.
                  </td>
                </tr>
              )}

              {orders.map((ord: OrderRow) => {
                const ship = fromOrder(ord);
                const total = normalizeTotal(ord);
                const currency = (ord?.currency || "EUR").toString().toUpperCase();
                const isResolved = (ord?.status || "").toUpperCase() === "RESOLVED";

                return (
                  <tr key={ord.id} className="border-b last:border-0 align-top bg-yellow-50">
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{ord.id}</td>
                    <td className="py-2 pr-3">{ship.fullName ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.email ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{ord.status ?? "—"}</td>
                    <td className="py-2 pr-3">{fmtMoney(total, currency)}</td>

                    <td className="py-2 pr-3">
                      <ResolveCheckbox
                        orderId={ord.id}
                        initialResolved={isResolved}
                        initialStatus={ord?.status || "pending"}
                      />
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/admin/orders/${ord.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          aria-label={`View order ${ord.id}`}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>

                        <form action={deleteOrderAction}>
                          <input type="hidden" name="orderId" value={ord.id} />
                          <input type="hidden" name="page" value={String(currentPage)} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                            aria-label={`Delete order ${ord.id}`}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
              <span className="font-semibold text-gray-700">{totalPages}</span>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href={`/admin/orders?page=${Math.max(1, currentPage - 1)}`}
                aria-disabled={currentPage === 1}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs hover:bg-gray-50 ${
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }`}
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </a>

              {/* First page ++ ellipsis */}
              {start > 1 && (
                <>
                  <a
                    href="/admin/orders?page=1"
                    className="inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    1
                  </a>
                  {start > 2 && <span className="px-1 text-gray-400">…</span>}
                </>
              )}

              {pages.map((p) => (
                <a
                  key={p}
                  href={`/admin/orders?page=${p}`}
                  className={`inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    p === currentPage ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-900" : ""
                  }`}
                  aria-current={p === currentPage ? "page" : undefined}
                >
                  {p}
                </a>
              ))}

              {/* Last page + ellipsis */}
              {end < totalPages && (
                <>
                  {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
                  <a
                    href={`/admin/orders?page=${totalPages}`}
                    className="inline-flex min-w-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    {totalPages}
                  </a>
                </>
              )}

              <a
                href={`/admin/orders?page=${Math.min(totalPages, currentPage + 1)}`}
                aria-disabled={currentPage === totalPages}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs hover:bg-gray-50 ${
                  currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                }`}
                title="Next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </a>
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}
