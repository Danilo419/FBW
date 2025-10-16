// src/app/admin/orders/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  BadgeCheck,
  Printer,
  User2,
  MapPin,
  Package,
} from "lucide-react";

/* ========================= Helpers ========================= */

type Currency = "EUR" | "USD" | "GBP" | "BRL" | "AUD" | "CAD" | "JPY";
const toCurrency = (s?: string | null): Currency =>
  (String(s || "EUR").toUpperCase() as Currency);

function money(cents: number, currency: Currency = "EUR") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

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

function pickStr(o: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = (o as any)?.[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function extractShipping(order: any) {
  const canonical = {
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

  if (
    canonical.fullName ||
    canonical.email ||
    canonical.phone ||
    canonical.address1 ||
    canonical.city ||
    canonical.postalCode ||
    canonical.country
  ) {
    return canonical;
  }

  const j = safeParseJSON(order.shippingJson);
  const g = (...alts: string[]) => pickStr(j, alts);

  return {
    fullName: g("fullName", "name", "recipient") ?? order?.user?.name ?? null,
    email: g("email") ?? order?.user?.email ?? null,
    phone: g("phone", "telephone"),
    address1: g("address1", "addressLine1", "line1", "street"),
    address2: g("address2", "addressLine2", "line2", "street2"),
    city: g("city", "locality", "town"),
    region: g("region", "state", "province"),
    postalCode: g(
      "postalCode",
      "postal_code",
      "postcode",
      "zip",
      "zipCode",
      "zipcode",
      "codigoPostal",
      "cep",
      "pincode",
      "eircode"
    ),
    country: g("country", "countryCode", "shippingCountry"),
  };
}

/* ========================= Data ========================= */

async function fetchOrder(id: string) {
  const order = (await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        // ⚠️ OrderItem não tem createdAt no teu schema — usar id/omitir
        orderBy: { id: "asc" },
        include: {
          product: { select: { id: true, slug: true, images: true } },
        },
      },
    },
  } as any)) as any;

  if (!order) return null;

  const currency = toCurrency(order.currency);

  const subtotalCents = Number(order.subtotal ?? 0);
  const shippingCents = Number(order.shipping ?? 0);
  const taxCents = Number(order.tax ?? 0);
  const totalCents =
    typeof order.totalCents === "number"
      ? order.totalCents
      : typeof order.total === "number"
      ? Math.round(order.total * 100)
      : subtotalCents + shippingCents + taxCents;

  const items = Array.isArray(order.items)
    ? order.items.map((it: any) => {
        const snap = safeParseJSON(it.snapshotJson);
        const options =
          safeParseJSON(snap?.optionsJson) ||
          safeParseJSON(snap?.options) ||
          safeParseJSON(snap?.selected) ||
          {};
        const personalization =
            snap?.personalization && typeof snap.personalization === "object"
              ? snap.personalization
              : null;

        const imageFromProduct =
          it.image ??
          (Array.isArray(it.product?.images) && it.product.images[0]) ??
          "/placeholder.png";

        const size =
          options.size ??
          snap?.size ??
          pickStr(snap, ["sizeLabel", "variant", "skuSize"]) ??
          null;

        let badges: string | null = null;
        const rawBadges = options.badges ?? snap?.badges ?? null;
        if (Array.isArray(rawBadges)) badges = rawBadges.join(", ");
        else if (rawBadges) badges = String(rawBadges);

        const customization =
          options.customization ?? snap?.customization ?? null;

        return {
          id: String(it.id),
          name: String(it.name ?? it.product?.name ?? "Product"),
          slug: it.product?.slug ?? null,
          image: imageFromProduct,
          qty: Number(it.qty ?? 1),
          unitPriceCents: Number(it.unitPrice ?? 0),
          totalPriceCents: Number(it.totalPrice ?? 0),
          size,
          options: {
            ...(options || {}),
            ...(badges ? { badges } : {}),
            ...(customization ? { customization } : {}),
          } as Record<string, string>,
          personalization:
            personalization && (personalization.name || personalization.number)
              ? {
                  name:
                    personalization.name != null
                      ? String(personalization.name)
                      : null,
                  number:
                    personalization.number != null
                      ? String(personalization.number)
                      : null,
                }
              : null,
        };
      })
    : [];

  return {
    id: String(order.id),
    status: String(order.status ?? "pending"),
    createdAt: order.createdAt as Date,
    currency,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    user: order.user ?? null,
    shipping: extractShipping(order),
    stripeSessionId: order.stripeSessionId ?? null,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    paypalOrderId: order.paypalOrderId ?? null,
    paypalCaptureId: order.paypalCaptureId ?? null,
    paidAt: order.paidAt ?? null,
    items,
  };
}

/* ========================= Page ========================= */

export default async function AdminOrderViewPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await fetchOrder(params.id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold">
            Order #{order.id.slice(0, 7)}
          </h1>
          <p className="text-sm text-gray-500">
            Created {new Date(order.createdAt).toLocaleString("en-GB")} • Status:{" "}
            <span className="font-medium">{order.status}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => typeof window !== "undefined" && window.print()}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print
            </span>
          </button>
          <Link
            href="/admin/(panel)"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </span>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500">Order ID</div>
            <div className="font-mono text-sm">{order.id}</div>

            <div className="mt-3 text-xs text-gray-500">Payment</div>
            <div className="text-sm">
              {order.paidAt ? (
                <span className="font-medium">Paid</span>
              ) : (
                <span>Unpaid</span>
              )}
            </div>
            {order.stripePaymentIntentId && (
              <div className="text-xs text-gray-500">
                Stripe PI: {order.stripePaymentIntentId}
              </div>
            )}
            {order.stripeSessionId && (
              <div className="text-xs text-gray-500">
                Stripe Session: {order.stripeSessionId}
              </div>
            )}
            {order.paypalOrderId && (
              <div className="text-xs text-gray-500">
                PayPal Order: {order.paypalOrderId}
              </div>
            )}
            {order.paypalCaptureId && (
              <div className="text-xs text-gray-500">
                PayPal Capture: {order.paypalCaptureId}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <User2 className="h-4 w-4" /> Customer
            </div>
            <div className="text-sm">
              {order.shipping.fullName ?? order.user?.name ?? "—"}
            </div>
            <div className="text-xs text-gray-500">
              {order.shipping.email ?? order.user?.email ?? "—"}
            </div>
            {order.shipping.phone && (
              <div className="text-xs text-gray-500">{order.shipping.phone}</div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4" /> Shipping address
            </div>
            <AddressBlock {...order.shipping} />
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <BadgeCheck className="h-4 w-4" /> Totals
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd>{money(order.subtotalCents, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd>{money(order.shippingCents, order.currency)}</dd>
              </div>
              {order.taxCents ? (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Tax</dt>
                  <dd>{money(order.taxCents, order.currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{money(order.totalCents, order.currency)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" /> Items
            </div>

            {order.items.length === 0 ? (
              <div className="text-sm text-gray-500">No items.</div>
            ) : (
              <div className="space-y-4">
                {order.items.map((it: any) => (
                  <ItemRow key={it.id} currency={order.currency} item={it} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ========================= UI Bits ========================= */

function AddressBlock(props: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const lines = [
    props.address1,
    props.address2,
    [props.city, props.region].filter(Boolean).join(", "),
    props.postalCode,
    props.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="text-sm">
      {props.fullName && <div>{props.fullName}</div>}
      {props.email && <div className="text-xs text-gray-500">{props.email}</div>}
      {props.phone && <div className="text-xs text-gray-500">{props.phone}</div>}
      <pre className="mt-2 whitespace-pre-wrap text-sm">{lines || "—"}</pre>

      <div className="mt-2">
        <button
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(lines);
            } catch {}
          }}
        >
          Copy address
        </button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  currency,
}: {
  currency: Currency;
  item: {
    id: string;
    name: string;
    slug: string | null;
    image?: string | null;
    qty: number;
    unitPriceCents: number;
    totalPriceCents: number;
    size?: string | null;
    options?: Record<string, string>;
    personalization?: { name?: string | null; number?: string | null } | null;
  };
}) {
  const prettyOptions =
    item.options &&
    Object.entries(item.options).flatMap(([k, raw]) => {
      if (raw == null || raw === "") return [];
      return [[k, String(raw).replace(/-/g, " ")] as const];
    });

  const hasPersonalization =
    !!item.personalization?.name || !!item.personalization?.number;

  return (
    <div className="grid grid-cols-[84px,1fr] gap-3">
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image || "/placeholder.png"}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-gray-500">
              Size: {item.size || "—"} • Qty: {item.qty}
            </div>
          </div>
          <div className="text-right text-sm">
            <div>{money(item.unitPriceCents, currency)}</div>
            <div className="font-semibold">
              {money(item.totalPriceCents, currency)}
            </div>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-xs text-gray-700">
          {prettyOptions &&
            prettyOptions.map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-500 capitalize">
                  {k.replace(/_/g, " ")}:
                </span>{" "}
                {v}
                {k === "badges" && (
                  <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                    FREE
                  </span>
                )}
              </div>
            ))}

          {hasPersonalization && (
            <div>
              <span className="text-gray-500">Personalization:</span>{" "}
              {[
                item.personalization?.name
                  ? `Name “${item.personalization.name}”`
                  : null,
                item.personalization?.number
                  ? `Number ${item.personalization.number}`
                  : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                FREE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
