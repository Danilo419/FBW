// src/app/admin/(panel)/orders/page.tsx
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
function extractPostalFromLooseText(raw?: any): string | undefined {
  if (typeof raw !== "string") return undefined;
  const re =
    /"(?:postal[_\s-]?code|postcode|post_code|zip(?:code)?|zip_code|zipcode|codigo(?:_)?postal|cep)"\s*:\s*"([^"]+)"/i;
  const m = raw.match(re);
  return m?.[1];
}
function fromOrder(order: any) {
  // First: prefer canonical columns when they exist
  if (
    order.shippingFullName ||
    order.shippingEmail ||
    order.shippingPhone ||
    order.shippingAddress1 ||
    order.shippingCity ||
    order.shippingPostalCode ||
    order.shippingCountry
  ) {
    return {
      fullName: order.shippingFullName ?? order?.user?.name ?? null,
      email: order.shippingEmail ?? order?.user?.email ?? null,
      phone: order.shippingPhone ?? null,
      address1: order.shippingAddress1 ?? null,
      address2: order.shippingAddress2 ?? null,
      city: order.shippingCity ?? null,
      region: order.shippingRegion ?? null,
      postalCode: order.shippingPostalCode ?? null,
      country: order.shippingCountry ?? null,
    };
  }
  // Fallback: try JSON blob (or loose text)
  const j = safeParseJSON(order?.shippingJson);
  const raw = typeof order?.shippingJson === "string" ? order.shippingJson : undefined;
  const candidates = (keys: string[]) =>
    [keys, ["shipping", ...keys], ["address", ...keys], ["delivery", ...keys]] as string[][];

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
      order?.user?.name ??
      null,
    email: getDeep(j, candidates(["email"])) ?? order?.user?.email ?? null,
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
    postalCode: postalFromJson ?? extractPostalFromLooseText(raw) ?? null,
    country:
      getDeep(j, candidates(["country"])) ??
      getDeep(j, candidates(["countryCode"])) ??
      getDeep(j, candidates(["shippingCountry"])) ??
      null,
  };
}

/* ---------- strong typing for the select ---------- */
const orderSelect = {
  id: true,
  status: true,
  createdAt: true,
  currency: true,
  subtotal: true,
  shipping: true,
  tax: true,
  total: true,
  totalCents: true,
  shippingFullName: true,
  shippingEmail: true,
  shippingPhone: true,
  shippingAddress1: true,
  shippingAddress2: true,
  shippingCity: true,
  shippingRegion: true,
  shippingPostalCode: true,
  shippingCountry: true,
  shippingJson: true,
  _count: { select: { items: true } }, // items count only
  user: { select: { name: true, email: true } },
} as const;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/* ---------- page ---------- */
export default async function OrdersPage() {
  // Explicitly type the result as OrderRow[]
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
                <th className="py-2 pr-3">Items</th>
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
                  <td className="py-3 text-gray-500" colSpan={14}>
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
                    <td className="py-2 pr-3">{ord._count?.items ?? 0}</td>
                    <td className="py-2 pr-3">{ship.fullName ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.email ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.phone ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.address1 ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.address2 ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.city ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.region ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.postalCode ?? "—"}</td>
                    <td className="py-2 pr-3">{ship.country ?? "—"}</td>
                    <td className="py-2 pr-3">{ord.status ?? "—"}</td>
                    <td className="py-2 pr-3">{fmtMoney(total, currency)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleString("en-GB") : "—"}
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
