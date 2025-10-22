// src/app/orders/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --------------------------- small helpers --------------------------- */

function money(cents?: number | null, currency = "EUR") {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString(undefined, { style: "currency", currency });
}

type ShippingJson =
  | {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      } | null;
    }
  | null;

function shippingFromOrder(order: any): ShippingJson {
  // Prefer canonical columns if present
  const canonical = {
    name: order.shippingFullName ?? null,
    email: order.shippingEmail ?? null,
    phone: order.shippingPhone ?? null,
    address: {
      line1: order.shippingAddress1 ?? null,
      line2: order.shippingAddress2 ?? null,
      city: order.shippingCity ?? null,
      state: order.shippingRegion ?? null,
      postal_code: order.shippingPostalCode ?? null,
      country: order.shippingCountry ?? null,
    },
  };

  const hasCanonical =
    canonical.name ||
    canonical.email ||
    canonical.phone ||
    canonical.address?.line1 ||
    canonical.address?.city ||
    canonical.address?.country;

  if (hasCanonical) return canonical;

  // Fallback to JSON snapshot (set during checkout)
  const snap = (order.shippingJson ?? null) as ShippingJson;
  return snap ?? { name: null, email: null, phone: null, address: null };
}

function computeTotalCents(order: any) {
  if (typeof order.totalCents === "number") return order.totalCents;
  if (typeof order.total === "number") return Math.round(order.total * 100); // legacy float
  const itemsSum =
    (order.items || []).reduce(
      (acc: number, it: any) => acc + (Number(it.totalPrice) || 0),
      0
    ) || 0;
  const shipping = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  return itemsSum + shipping + tax;
}

/* ----------------------------- data load ---------------------------- */

async function loadOrder(id: string) {
  // ⚠️ Your OrderItem model does NOT have createdAt; do not orderBy it.
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          qty: true,
          totalPrice: true,
          image: true,
        },
        orderBy: { id: "asc" }, // safe field to sort by
      },
    },
  });
  return order;
}

/* -------------------------------- page ------------------------------ */

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);

  if (!order) {
    notFound();
  }

  const ship = shippingFromOrder(order);
  const totalCents = computeTotalCents(order);
  const currency = (order.currency || "eur").toUpperCase();

  const status = String(order.status || "").toLowerCase();
  const statusStyle =
    status === "paid" || status === "shipped" || status === "delivered"
      ? "bg-green-100 text-green-700 border border-green-200"
      : status === "pending"
      ? "bg-amber-100 text-amber-800 border border-amber-200"
      : "bg-gray-100 text-gray-700 border";

  return (
    <main className="container-fw pt-12 pb-20">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to store
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Order details</h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main column */}
          <section className="md:col-span-2 space-y-4">
            <div className="rounded-xl border">
              <div className="border-b px-4 py-3 font-semibold">Items</div>
              <ul className="divide-y">
                {order.items.map((it: any) => (
                  <li key={it.id} className="flex items-center gap-4 p-4">
                    <div className="relative h-14 w-14 rounded-md border bg-gray-50 overflow-hidden">
                      <Image
                        src={it.image || "/placeholder.png"}
                        alt={it.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                        priority={false}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-sm text-gray-600">Qty: {it.qty}</div>
                    </div>

                    <div className="shrink-0 font-semibold">
                      {money(it.totalPrice, currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">Summary</h2>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(order.subtotal ?? null, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{money(order.shipping ?? 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{money(order.tax ?? 0, currency)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                  <span>Total</span>
                  <span>{money(totalCents, currency)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">Meta</h2>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <div>
                  <span className="text-gray-500">ID:</span>{" "}
                  <span className="font-mono break-all">{order.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </div>
                {order.paidAt && (
                  <div>
                    <span className="text-gray-500">Paid at:</span>{" "}
                    {new Date(order.paidAt).toLocaleString()}
                  </div>
                )}
                {order.paymentStatus && (
                  <div>
                    <span className="text-gray-500">Payment:</span>{" "}
                    {order.paymentStatus}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">Shipping</h2>
              {ship ? (
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  {ship.name && <div>{ship.name}</div>}
                  {ship.email && <div>{ship.email}</div>}
                  {ship.phone && <div>{ship.phone}</div>}
                  {ship.address && (
                    <div>
                      {ship.address.line1 && <div>{ship.address.line1}</div>}
                      {ship.address.line2 && <div>{ship.address.line2}</div>}
                      <div>
                        {[ship.address.postal_code, ship.address.city]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                      <div>
                        {[ship.address.state, ship.address.country]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No shipping info.</p>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="font-semibold">Actions</h2>
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  href="/"
                  className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50"
                >
                  Continue shopping
                </Link>
                <Link
                  href="/account"
                  className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50"
                >
                  Go to my account
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ----------------------------- metadata ---------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  const title = order ? `Order ${order.id} — ${order.status}` : "Order";
  return { title };
}
