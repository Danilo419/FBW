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

/* ---------- helpers ---------- */
// Use a locale que usa ponto como separador de milhar (pt-BR).
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
    // If the Visit table doesn't exist yet, return zeros so the dashboard doesn't crash
    return { uniqToday: 0, uniq7d: 0, uniqNow: 0, viewsToday: 0 };
  }
}

/* ---------- orders ---------- */
async function getRecentOrders(limit = 10) {
  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" } as any,
      select: {
        id: true,
        status: true,
        createdAt: true,
        currency: true,
        subtotal: true,
        shipping: true,
        tax: true,
        total: true,
        totalCents: true,
        items: { select: { totalPrice: true } }, // <- needed to compute robust totals
        // canonical columns (when present)
        shippingFullName: true,
        shippingEmail: true,
        shippingPhone: true,
        shippingAddress1: true,
        shippingAddress2: true,
        shippingCity: true,
        shippingRegion: true,
        shippingPostalCode: true,
        shippingCountry: true,
        // fallback
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

// last resort: extract from loose non-JSON text like `"postal_code":"XXXX"`
function extractPostalFromLooseText(raw?: any): string | undefined {
  if (typeof raw !== "string") return undefined;
  const re =
    /"(?:postal[_\s-]?code|postcode|post_code|zip(?:code)?|zip_code|zipcode|codigo(?:_)?postal|cep)"\s*:\s*"([^"]+)"/i;
  const m = raw.match(re);
  return m?.[1];
}

function fromOrder(o: any) {
  // 1) use canonical columns when available
  if (
    o.shippingFullName ||
    o.shippingEmail ||
    o.shippingPhone ||
    o.shippingAddress1 ||
    o.shippingCity ||
    o.shippingPostalCode ||
    o.shippingCountry
  ) {
    return {
      fullName: o.shippingFullName ?? o?.user?.name ?? null,
      email: o.shippingEmail ?? o?.user?.email ?? null,
      phone: o.shippingPhone ?? null,
      address1: o.shippingAddress1 ?? null,
      address2: o.shippingAddress2 ?? null,
      city: o.shippingCity ?? null,
      region: o.shippingRegion ?? null,
      postalCode: o.shippingPostalCode ?? null,
      country: o.shippingCountry ?? null,
    };
  }

  // 2) fallback: JSON (when valid) or loose text
  const j = safeParseJSON(o?.shippingJson);
  const raw = typeof o?.shippingJson === "string" ? o.shippingJson : undefined;

  const candidates = (keys: string[]) =>
    [
      keys, // flat
      ["shipping", ...keys],
      ["address", ...keys],
      ["delivery", ...keys],
    ] as string[][];

  const postalFromJson =
    getDeep(j, candidates(["postalCode"])) ??
    getDeep(j, candidates(["postal_code"])) ??
    getDeep(j, candidates(["post_code"])) ??
    getDeep(j, candidates(["postcode"])) ??
    getDeep(j, candidates(["postCode"])) ??
    getDeep(j, candidates(["zip"])) ??
    getDeep(j, candidates(["zipCode"])) ??
    getDeep(j, candidates(["zip_code"])) ??
    getDeep(j, candidates(["zipcode"])) ??
    getDeep(j, candidates(["codigoPostal"])) ??
    getDeep(j, candidates(["codigo_postal"])) ??
    getDeep(j, candidates(["cep"])) ??
    getDeep(j, candidates(["pincode"])) ??
    getDeep(j, candidates(["eircode"])) ??
    undefined;

  return {
    fullName:
      getDeep(j, candidates(["fullName"])) ??
      getDeep(j, candidates(["name"])) ??
      getDeep(j, candidates(["recipient"])) ??
      o?.user?.name ??
      null,

    email: getDeep(j, candidates(["email"])) ?? o?.user?.email ?? null,

    phone:
      getDeep(j, candidates(["phone"])) ??
      getDeep(j, candidates(["telephone"])) ??
      null,

    address1:
      getDeep(j, candidates(["address1"])) ??
      getDeep(j, candidates(["addressLine1"])) ??
      getDeep(j, candidates(["line1"])) ??
      getDeep(j, candidates(["street"])) ??
      null,

    address2:
      getDeep(j, candidates(["address2"])) ??
      getDeep(j, candidates(["addressLine2"])) ??
      getDeep(j, candidates(["line2"])) ??
      getDeep(j, candidates(["street2"])) ??
      null,

    city:
      getDeep(j, candidates(["city"])) ??
      getDeep(j, candidates(["locality"])) ??
      getDeep(j, candidates(["town"])) ??
      null,

    region:
      getDeep(j, candidates(["region"])) ??
      getDeep(j, candidates(["state"])) ??
      getDeep(j, candidates(["province"])) ??
      null,

    // ✅ postalCode with fallback to loose text
    postalCode: postalFromJson ?? extractPostalFromLooseText(raw) ?? null,

    country:
      getDeep(j, candidates(["country"])) ??
      getDeep(j, candidates(["countryCode"])) ??
      getDeep(j, candidates(["shippingCountry"])) ??
      null,
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
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Address 1</th>
                <th className="py-2 pr-3">Address 2</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Region/State</th>
                <th className="py-2 pr-3">Postal code</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={13}>
                    No data to display.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const ship = fromOrder(o);
                const money = moneyFromOrder(o, (o?.currency || "EUR").toString());
                return (
                  <tr key={o.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{o.id}</td>
                    <td className="py-2 pr-3">{ship.fullName ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.email ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.phone ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.address1 ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.address2 ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.city ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.region ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.postalCode ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.country ?? "—"}</td>
                    <td className="py-2 pr-3">{o?.status ?? "—"}</td>
                    <td className="py-2 pr-3">{money.label}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {o?.createdAt ? new Date(o.createdAt).toLocaleString("en-GB") : "—"}
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

function KpiCard(props: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow border">
      <div className="text-sm text-gray-500">{props.title}</div>
      <div className="text-3xl font-extrabold mt-1">{props.value}</div>
      {props.subtitle && <div className="text-xs text-gray-400 mt-1">{props.subtitle}</div>}
    </div>
  );
}
