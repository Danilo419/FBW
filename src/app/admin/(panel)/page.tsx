// src/app/admin/(panel)/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import {
  getOrdersShippedCount,
  getCountriesServedCount,
  getTotalRevenuePaidCents,
} from "@/lib/kpis";
import { formatMoney, moneyFromOrder } from "@/lib/money";
import { Eye } from "lucide-react";
import { revalidatePath } from "next/cache";

/* ---------- SERVER ACTION: mark order as resolved ---------- */
export async function markOrderResolved(orderId: string) {
  "use server";
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "RESOLVED" },
    });
  } catch (e) {
    // Se o status for enum diferente, não quebra a página
    console.error("markOrderResolved:", e);
  } finally {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
  }
}

/* ---------- helpers ---------- */
// Use a locale that uses dot as thousands separator (pt-BR).
function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

/* ---------- metrics ---------- */
async function getStats() {
  let usersCount = 0;
  try {
    usersCount = await prisma.user.count();
  } catch {}

  let avgRating = 0;
  try {
    const agg = await prisma.review.aggregate({ _avg: { rating: true } } as any);
    avgRating = Number(agg?._avg?.rating ?? 0);
  } catch {}

  let shippedOrders = 0;
  try {
    shippedOrders = await getOrdersShippedCount();
  } catch {}

  let countriesServed = 0;
  try {
    countriesServed = await getCountriesServedCount();
  } catch {}

  let revenueCents = 0;
  try {
    revenueCents = await getTotalRevenuePaidCents();
  } catch {}

  return { usersCount, avgRating, shippedOrders, countriesServed, revenueCents };
}

/* ---------- analytics: visitors ---------- */
async function getTrafficStats() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);

    const [uniqToday, uniq7d, uniqNow, viewsToday] = await Promise.all([
      prisma.visit
        .findMany({
          where: { createdAt: { gte: todayStart } },
          select: { visitorId: true },
          distinct: ["visitorId"] as any,
        } as any)
        .then((r) => r.length),
      prisma.visit
        .findMany({
          where: { createdAt: { gte: last7d } },
          select: { visitorId: true },
          distinct: ["visitorId"] as any,
        } as any)
        .then((r) => r.length),
      prisma.visit
        .findMany({
          where: { createdAt: { gte: last5min } },
          select: { visitorId: true },
          distinct: ["visitorId"] as any,
        } as any)
        .then((r) => r.length),
      prisma.visit.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    return { uniqToday, uniq7d, uniqNow, viewsToday };
  } catch {
    return { uniqToday: 0, uniq7d: 0, uniqNow: 0, viewsToday: 0 };
  }
}

/* ---------- orders (reduced select) ---------- */
async function getRecentOrders(limit = 10) {
  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" } as any,
      select: {
        id: true,
        status: true,
        currency: true,
        subtotal: true,
        shipping: true,
        tax: true,
        total: true,
        totalCents: true,
        items: { select: { totalPrice: true } }, // used by moneyFromOrder
        shippingFullName: true,
        shippingEmail: true,
        shippingJson: true,
        user: { select: { name: true, email: true } },
      } as any,
    } as any);
    return orders as any[];
  } catch {
    return [];
  }
}

/* ---------- robust utils to extract shipping ---------- */
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
function fromOrder(o: any) {
  if (o.shippingFullName || o.shippingEmail) {
    return {
      fullName: o.shippingFullName ?? o?.user?.name ?? null,
      email: o.shippingEmail ?? o?.user?.email ?? null,
    };
  }
  const j = safeParseJSON(o?.shippingJson);
  const candidates = (keys: string[]) =>
    [keys, ["shipping", ...keys], ["address", ...keys], ["delivery", ...keys]] as string[][];
  return {
    fullName:
      getDeep(j, candidates(["fullName"])) ??
      getDeep(j, candidates(["name"])) ??
      getDeep(j, candidates(["recipient"])) ??
      o?.user?.name ??
      null,
    email: getDeep(j, candidates(["email"])) ?? o?.user?.email ?? null,
  };
}

/* ---------- page ---------- */
export default async function AdminDashboardPage() {
  const [{ usersCount, avgRating, shippedOrders, countriesServed, revenueCents }, traffic, orders] =
    await Promise.all([getStats(), getTrafficStats(), getRecentOrders(12)]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of key metrics.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Community" value={fmtInt(usersCount)} subtitle="Registered users" />
        <KpiCard
          title="Average rating"
          value={avgRating ? `${avgRating.toFixed(2)} ★` : "—"}
          subtitle="Global average"
        />
        <KpiCard title="Orders shipped" value={fmtInt(shippedOrders)} subtitle="Total shipped" />
        <KpiCard title="Countries served" value={fmtInt(countriesServed)} subtitle="Distinct countries" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow border">
          <h3 className="font-semibold mb-2">Total revenue (paid)</h3>
          <p className="text-3xl font-extrabold">{formatMoney(revenueCents, "EUR")}</p>
          <p className="text-xs text-gray-500 mt-1">Sum of paid/settled orders.</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow border">
          <h3 className="font-semibold mb-1">Visitors</h3>
          <div className="text-3xl font-extrabold">{fmtInt(traffic.uniqToday)}</div>
          <p className="text-xs text-gray-500 mt-1">Uniques today</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 border p-3">
              <div className="text-xs text-gray-500">Last 7 days</div>
              <div className="text-xl font-bold">{fmtInt(traffic.uniq7d)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border p-3">
              <div className="text-xs text-gray-500">Live (5 min)</div>
              <div className="text-xl font-bold">{fmtInt(traffic.uniqNow)}</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Pageviews today: {fmtInt(traffic.viewsToday)}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow border">
        <h3 className="font-semibold mb-3">Recent orders</h3>
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
                    No data to display.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const ship = fromOrder(o);
                const money = moneyFromOrder(o, (o?.currency || "EUR").toString());
                const isResolved = (o?.status || "").toUpperCase() === "RESOLVED";

                return (
                  <tr key={o.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{o.id}</td>
                    <td className="py-2 pr-3">{ship.fullName ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.email ?? "—"}</td>
                    <td className="py-2 pr-3">{o?.status ?? "—"}</td>
                    <td className="py-2 pr-3">{money.label}</td>
                    <td className="py-2 pr-3">
                      <ResolveCheckbox orderId={o.id} initialResolved={isResolved} />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <a
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                        aria-label={`View order ${o.id}`}
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

/* ---------- client bits ---------- */
function KpiCard(props: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow border">
      <div className="text-sm text-gray-500">{props.title}</div>
      <div className="text-3xl font-extrabold mt-1">{props.value}</div>
      {props.subtitle && <div className="text-xs text-gray-400 mt-1">{props.subtitle}</div>}
    </div>
  );
}

/* A caixinha com confetes */
function ResolveCheckbox(props: { orderId: string; initialResolved: boolean }) {
  "use client";
  const { orderId, initialResolved } = props;
  const [checked, setChecked] = React.useState(initialResolved);
  const [firing, setFiring] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const onToggle = () => {
    if (checked) return; // já resolvido
    setChecked(true);
    setFiring(true);
    startTransition(async () => {
      await markOrderResolved(orderId);
    });
    setTimeout(() => setFiring(false), 1200);
  };

  return (
    <>
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-0"
          checked={checked}
          onChange={onToggle}
          disabled={checked || pending}
        />
        <span className="text-xs">{checked ? "Resolved" : "Mark resolved"}</span>
      </label>

      {firing && <ConfettiBurst />}
    </>
  );
}

function ConfettiBurst() {
  "use client";
  const pieces = Array.from({ length: 28 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div className="relative">
        {pieces.map((_, i) => (
          <span key={i} className="confetti-piece" style={{ ["--i" as any]: i } as React.CSSProperties} />
        ))}
      </div>
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 12px;
          top: 0;
          left: 0;
          border-radius: 1px;
          background: hsl(calc(var(--i) * 13), 90%, 55%);
          transform: translate(-50%, -50%) rotate(45deg);
          animation: confetti-burst 900ms ease-out forwards;
          opacity: 0.95;
        }
        @keyframes confetti-burst {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(
                calc((var(--i) - 14) * 16px),
                calc(-120px - (var(--i) % 5) * 20px)
              )
              rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* Import React para os client components acima */
import * as React from "react";
