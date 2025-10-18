// src/app/admin/(panel)/orders/page.tsx
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Eye } from "lucide-react";

/* ---------- helpers ---------- */
function fmtMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}
function normalizeTotal(o: any): number {
  if (typeof o.total === "number") return o.total;
  if (typeof o.totalCents === "number") return o.totalCents / 100;
  const s = Number(o.subtotal ?? 0);
  const sh = Number(o.shipping ?? 0);
  const t = Number(o.tax ?? 0);
  const sum = s + sh + t;
  return sum < 10000 ? sum / 100 : sum;
}

/* ---------- shipping utils (minimal for name/email) ---------- */
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
  // Preferir colunas canónicas
  if (order.shippingFullName || order.shippingEmail) {
    return {
      fullName: order.shippingFullName ?? order?.user?.name ?? null,
      email: order.shippingEmail ?? order?.user?.email ?? null,
    };
  }
  // Fallback: JSON
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

/* ---------- select reduzido ---------- */
const orderSelect = {
  id: true,
  status: true,
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

/* ---------- page ---------- */
export default async function OrdersPage() {
  const orders: OrderRow[] = await prisma.order.findMany({
    orderBy: { createdAt: "desc" } as any,
    take: 100,
    select: orderSelect,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Orders</h1>
        <p className="text-sm text-gray-500">Full list of the most recent orders.</p>
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
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    No data to display.
                  </td>
                </tr>
              )}
              {orders.map((ord) => {
                const ship = fromOrder(ord);
                const total = normalizeTotal(ord);
                const currency = (ord?.currency || "EUR").toString().toUpperCase();

                return (
                  <tr key={ord.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{ord.id}</td>
                    <td className="py-2 pr-3">{ship.fullName ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.email ?? "—"}</td>
                    <td className="py-2 pr-3">{ord.status ?? "—"}</td>
                    <td className="py-2 pr-3">{fmtMoney(total, currency)}</td>
                    <td className="py-2 pr-3 text-right">
                      <a
                        href={`/admin/orders/${ord.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        aria-label={`View order ${ord.id}`}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </a>
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
