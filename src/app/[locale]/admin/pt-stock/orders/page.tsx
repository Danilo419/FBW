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

function getOrderTotalCents(order: any) {
  if (typeof order.totalCents === "number") return order.totalCents;

  return (
    Number(order.subtotal ?? 0) +
    Number(order.shipping ?? 0) +
    Number(order.tax ?? 0)
  );
}

/* ---------- customer helpers ---------- */
function safeParseJSON(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input;
  return {};
}

function getDeep(obj: any, paths: string[][]): string | undefined {
  for (const p of paths) {
    let cur = obj;
    for (const k of p) {
      if (cur && typeof cur === "object" && k in cur) cur = cur[k];
      else {
        cur = undefined;
        break;
      }
    }
    if (cur != null) {
      const s = String(cur).trim();
      if (s) return s;
    }
  }
  return undefined;
}

function getCustomerInfo(order: any) {
  if (order.shippingFullName || order.shippingEmail) {
    return {
      fullName: order.shippingFullName ?? order?.user?.name ?? null,
      email: order.shippingEmail ?? order?.user?.email ?? null,
    };
  }

  const j = safeParseJSON(order?.shippingJson);

  const candidates = (keys: string[]) =>
    [keys, ["shipping", ...keys], ["address", ...keys], ["delivery", ...keys]];

  return {
    fullName:
      getDeep(j, candidates(["fullName"])) ??
      getDeep(j, candidates(["name"])) ??
      getDeep(j, candidates(["recipient"])) ??
      order?.user?.name ??
      null,

    email:
      getDeep(j, candidates(["email"])) ??
      order?.user?.email ??
      null,
  };
}

/* ---------- filter ---------- */
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
  createdAt: true,

  totalCents: true,
  subtotal: true,
  shipping: true,
  tax: true,

  shippingFullName: true,
  shippingEmail: true,
  shippingJson: true,

  user: {
    select: {
      name: true,
      email: true,
    },
  },

  items: {
    select: {
      name: true,
      qty: true,
    },
  },
} as const;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/* ---------- actions ---------- */
async function deleteOrderAction(formData: FormData) {
  "use server";

  const orderId = String(formData.get("orderId") ?? "");
  const page = String(formData.get("page") ?? "1");
  const locale = String(formData.get("locale") ?? "pt");

  if (!orderId) return;

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath(`/${locale}/admin/pt-stock/orders`);
  redirect(`/${locale}/admin/pt-stock/orders?page=${page}`);
}

/* ---------- page ---------- */
export default async function AdminPtStockOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};

  const currentPage = Math.max(1, Number(sp.page ?? 1));
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold md:text-3xl">PT Stock Orders</h1>
        <p className="text-sm text-gray-500">
          ({totalCount} total)
        </p>
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
                <th className="py-2 pr-3">Resolve</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-gray-500">
                    No orders
                  </td>
                </tr>
              )}

              {orders.map((order: OrderRow) => {
                const total = getOrderTotalCents(order);
                const customer = getCustomerInfo(order);

                const itemCount = order.items.reduce(
                  (acc, it) => acc + (it.qty ?? 0),
                  0
                );

                return (
                  <tr key={order.id} className="border-b bg-yellow-50">
                    <td className="py-2 pr-3 font-mono">{order.id}</td>

                    <td className="py-2 pr-3">
                      {customer.fullName ?? "—"}
                    </td>

                    <td className="py-2 pr-3">
                      {customer.email ?? "—"}
                    </td>

                    <td className="py-2 pr-3">
                      {itemCount} items
                    </td>

                    <td className="py-2 pr-3 font-semibold">
                      {formatMoneyRight(total)}
                    </td>

                    <td className="py-2 pr-3">
                      <ResolveCheckbox
                        orderId={order.id}
                        initialResolved={false}
                        initialStatus={order.status || "pending"}
                      />
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/orders/${order.id}`} locale={locale}>
                          <Eye className="h-4 w-4" />
                        </Link>

                        <form action={deleteOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="page" value={currentPage} />
                          <input type="hidden" name="locale" value={locale} />

                          <button type="submit">
                            <Trash2 className="h-4 w-4 text-red-600" />
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
      </section>
    </div>
  );
}