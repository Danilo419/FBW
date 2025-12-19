// src/app/admin/orders/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  BadgeCheck,
  User2,
  MapPin,
  Package,
  AlertTriangle,
  Printer,
  Mail,
} from "lucide-react";
import { PrintButton } from "@/components/admin/PrintButton"; // client component
import { updateOrderTrackingAction } from "../actions";

/* ========================= Helpers ========================= */

type Currency = "EUR" | "USD" | "GBP" | "BRL" | "AUD" | "CAD" | "JPY";
const toCurrency = (s?: string | null): Currency =>
  String(s || "EUR").toUpperCase() as Currency;

function money(cents: number, currency: Currency = "EUR") {
  const safe = Number.isFinite(cents) ? cents : 0;
  return (safe / 100).toLocaleString("en-US", { style: "currency", currency });
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
  if (!o || typeof o !== "object") return null;
  for (const k of keys) {
    const v = (o as any)?.[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function extractShipping(order: any) {
  try {
    const canonical = {
      fullName: order?.shippingFullName ?? order?.user?.name ?? null,
      email: order?.shippingEmail ?? order?.user?.email ?? null,
      phone: order?.shippingPhone ?? null,
      address1: order?.shippingAddress1 ?? null,
      address2: order?.shippingAddress2 ?? null,
      city: order?.shippingCity ?? null,
      region: order?.shippingRegion ?? null,
      postalCode: order?.shippingPostalCode ?? null,
      country: order?.shippingCountry ?? null,
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

    const j = safeParseJSON(order?.shippingJson);
    const g = (...alts: string[]) => pickStr(j, alts);

    return {
      fullName: g("fullName", "name", "recipient") ?? order?.user?.name ?? null,
      email:
        g("email", "ship_email", "customer_email") ?? order?.user?.email ?? null,
      phone: g("phone", "telephone", "ship_phone"),
      address1: g("address1", "addressLine1", "line1", "street", "ship_line1"),
      address2: g("address2", "addressLine2", "line2", "street2", "ship_line2"),
      city: g("city", "locality", "town", "ship_city"),
      region: g("region", "state", "province", "ship_state"),
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
        "eircode",
        "ship_postal"
      ),
      country: g("country", "countryCode", "shippingCountry", "ship_country"),
    };
  } catch {
    return {
      fullName: order?.user?.name ?? null,
      email: order?.user?.email ?? null,
      phone: null,
      address1: null,
      address2: null,
      city: null,
      region: null,
      postalCode: null,
      country: null,
    };
  }
}

function extractTracking(order: any) {
  const j = safeParseJSON(order?.shippingJson);
  const trackingCode =
    pickStr(j, ["trackingCode", "tracking_code", "tracking"]) ?? null;
  const trackingUrl =
    pickStr(j, ["trackingUrl", "tracking_url", "tracking_link"]) ?? null;

  // Your admin action uses Order.status as the shipping flow
  // We map it back to the select values the form sends.
  const status = String(order?.status ?? "pending");
  const shippingStatus =
    status === "delivered"
      ? "DELIVERED"
      : status === "shipped"
      ? "SHIPPED"
      : status === "paid"
      ? "PROCESSING"
      : "PENDING";

  return { trackingCode, trackingUrl, shippingStatus };
}

function ensureArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function fallbackId(idx: number, it: any) {
  const base = it?.id ?? it?.orderId ?? it?.productId ?? it?.name ?? "item";
  return `${String(base)}-${idx}`;
}

/** --- Personalization extraction (robust) --- */
function extractPersonalization(it: any, snap: any, optionsObj: any) {
  // 1) direct fields on item (some schemas store these)
  const directName =
    pickStr(it, [
      "personalizationName",
      "playerName",
      "custName",
      "nameOnShirt",
      "shirtName",
      "customName",
      "name",
    ]) ?? null;

  const directNumber =
    pickStr(it, [
      "personalizationNumber",
      "playerNumber",
      "custNumber",
      "numberOnShirt",
      "shirtNumber",
      "customNumber",
      "number",
    ]) ?? null;

  // 2) personalization JSON on item
  const itPersJ = safeParseJSON(it?.personalizationJson);
  const itPersName =
    pickStr(itPersJ, ["name", "playerName", "customName", "shirtName"]) ?? null;
  const itPersNumber =
    pickStr(itPersJ, ["number", "playerNumber", "customNumber", "shirtNumber"]) ??
    null;

  // 3) snapshot.personalization / snapshot.personalizationJson / snapshot fields
  const snapPers = snap?.personalization && typeof snap.personalization === "object"
    ? snap.personalization
    : null;
  const snapPersJ = safeParseJSON(snap?.personalizationJson);

  const snapName =
    (snapPers ? pickStr(snapPers, ["name", "playerName", "customName"]) : null) ??
    pickStr(snapPersJ, ["name", "playerName", "customName"]) ??
    pickStr(snap, ["custName", "customerName", "playerName", "nameOnShirt"]) ??
    null;

  const snapNumber =
    (snapPers ? pickStr(snapPers, ["number", "playerNumber", "customNumber"]) : null) ??
    pickStr(snapPersJ, ["number", "playerNumber", "customNumber"]) ??
    pickStr(snap, ["custNumber", "customerNumber", "playerNumber", "numberOnShirt"]) ??
    null;

  // 4) sometimes stored inside options (rare, but happens)
  const optName =
    pickStr(optionsObj, [
      "name",
      "custName",
      "player_name",
      "playerName",
      "shirt_name",
      "shirtName",
      "nameOnShirt",
    ]) ?? null;

  const optNumber =
    pickStr(optionsObj, [
      "number",
      "custNumber",
      "player_number",
      "playerNumber",
      "shirt_number",
      "shirtNumber",
      "numberOnShirt",
    ]) ?? null;

  const name = (directName ?? itPersName ?? snapName ?? optName)?.trim() || null;

  // keep only digits for number, and trim
  const numRaw = (directNumber ?? itPersNumber ?? snapNumber ?? optNumber)?.trim() || "";
  const onlyDigits = numRaw.replace(/\D/g, "");
  const number = onlyDigits ? onlyDigits : null;

  if (!name && !number) return null;

  return { name, number };
}

/* ========================= Data ========================= */

async function fetchOrder(id: string) {
  try {
    const order = (await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          orderBy: { id: "asc" },
          include: {
            // ✅ schema uses imageUrls (not images)
            product: {
              select: { id: true, slug: true, imageUrls: true, name: true },
            },
          },
        },
      },
    } as any)) as any | null;

    if (!order) return { order: null, error: null };

    const currency = toCurrency(order.currency);
    const subtotalCents = Number(order.subtotal ?? 0);
    const shippingCents = Number(order.shipping ?? 0);
    const taxCents = Number(order.tax ?? 0);
    const totalCents =
      typeof order.totalCents === "number"
        ? Number(order.totalCents)
        : typeof order.total === "number"
        ? Math.round(Number(order.total) * 100)
        : subtotalCents + shippingCents + taxCents;

    const itemsRaw = ensureArray<any>(order.items);

    const items = itemsRaw.map((it, i) => {
      const snap = safeParseJSON(it?.snapshotJson);

      const optionsObj =
        safeParseJSON(snap?.optionsJson) ||
        safeParseJSON(snap?.options) ||
        safeParseJSON(snap?.selected) ||
        {};

      // ✅ FIX: extract personalization from multiple possible places
      const personalization = extractPersonalization(it, snap, optionsObj);

      const size =
        (optionsObj as any).size ??
        snap?.size ??
        pickStr(snap, ["sizeLabel", "variant", "skuSize"]) ??
        null;

      let badges: string | null = null;
      const rawBadges =
        (optionsObj as any).badges ??
        snap?.badges ??
        (optionsObj as any)["competition_badge"] ??
        null;
      if (Array.isArray(rawBadges)) badges = rawBadges.join(", ");
      else if (rawBadges && typeof rawBadges === "object") {
        badges = Object.values(rawBadges).join(", ");
      } else if (rawBadges) badges = String(rawBadges);

      const productImages = ensureArray<string>(it?.product?.imageUrls);
      const image = it?.image ?? productImages[0] ?? "/placeholder.png";

      const unitPriceCents = Number(it?.unitPrice ?? 0);
      const totalPriceCents = Number(
        it?.totalPrice ?? unitPriceCents * Number(it?.qty ?? 1)
      );

      const options: Record<string, string> = {};
      for (const [k, v] of Object.entries(optionsObj)) {
        if (v == null || v === "") continue;
        if (Array.isArray(v)) options[k] = v.join(", ");
        else if (typeof v === "object")
          options[k] = Object.values(v as any).join(", ");
        else options[k] = String(v);
      }
      if (badges) options.badges = badges;

      return {
        id: fallbackId(i, it),
        name: String(it?.name ?? it?.product?.name ?? "Product"),
        slug: it?.product?.slug ?? null,
        image,
        qty: Number(it?.qty ?? 1),
        unitPriceCents,
        totalPriceCents,
        size,
        options,
        personalization,
      };
    });

    const shipping = extractShipping(order);

    return {
      order: {
        id: String(order.id),
        status: String(order.status ?? "pending"),
        createdAt: order?.createdAt ? new Date(order.createdAt) : null,
        currency,
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        user: order.user ?? null,
        shipping,
        tracking: extractTracking(order),
        stripeSessionId: order.stripeSessionId ?? null,
        stripePaymentIntentId: order.stripePaymentIntentId ?? null,
        paypalOrderId: order.paypalOrderId ?? null,
        paypalCaptureId: order.paypalCaptureId ?? null,
        paidAt: order.paidAt ?? null,
        items,
      },
      error: null,
    };
  } catch (e: any) {
    return { order: null, error: String(e?.message || e) };
  }
}

/* ========================= Page ========================= */

export default async function AdminOrderViewPage({
  params,
}: {
  // ✅ Next 15: params is a Promise
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { order, error } = await fetchOrder(id);

  const customerEmail = order?.shipping?.email ?? order?.user?.email ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold truncate">
            {order ? `Order #${order.id.slice(0, 7)}` : "Order"}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </span>
          </Link>
          <PrintButton className="rounded-xl border px-3 py-2 hover:bg-gray-50 inline-flex items-center">
            <Printer className="h-4 w-4" />
            <span className="sr-only">Print</span>
          </PrintButton>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {order?.createdAt
          ? `Created ${new Date(order.createdAt).toLocaleString("en-GB")}`
          : "Created —"}
        {" • "}
        Status: <span className="font-medium">{order?.status ?? "—"}</span>
      </p>

      {error && (
        <div className="rounded-2xl border bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <div className="font-semibold">We couldn’t load some data</div>
              <div className="text-sm opacity-90">
                The page is still displayed with what we could parse. Error:{" "}
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {!order ? (
        <div className="rounded-2xl border bg-white p-6">Order not found.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* LEFT */}
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Order ID</div>
              <div className="font-mono text-sm break-all">{order.id}</div>

              <div className="mt-3 text-xs text-gray-500">Payment</div>
              <div className="text-sm">
                {order.paidAt ? (
                  <span className="font-medium">Paid</span>
                ) : (
                  <span>Unpaid</span>
                )}
              </div>
              {order.stripePaymentIntentId && (
                <div className="text-xs text-gray-500 break-all">
                  Stripe PI: {order.stripePaymentIntentId}
                </div>
              )}
              {order.stripeSessionId && (
                <div className="text-xs text-gray-500 break-all">
                  Stripe Session: {order.stripeSessionId}
                </div>
              )}
              {order.paypalOrderId && (
                <div className="text-xs text-gray-500 break-all">
                  PayPal Order: {order.paypalOrderId}
                </div>
              )}
              {order.paypalCaptureId && (
                <div className="text-xs text-gray-500 break-all">
                  PayPal Capture: {order.paypalCaptureId}
                </div>
              )}
            </section>

            {/* ✅ Fulfillment / Tracking */}
            <section className="rounded-2xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-semibold">Fulfillment / Tracking</div>
                <span className="text-xs text-gray-500">
                  Stored in shippingJson
                </span>
              </div>

              {customerEmail ? (
                <div className="mb-3 rounded-xl border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>
                      When you click <strong>Save</strong>, the customer will be
                      emailed automatically at{" "}
                      <span className="font-semibold">{customerEmail}</span>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Customer email not found — the update can be saved, but no
                  email can be sent.
                </div>
              )}

              <form action={updateOrderTrackingAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Shipping status
                  </label>
                  <select
                    name="shippingStatus"
                    defaultValue={order.tracking.shippingStatus}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tracking code
                  </label>
                  <input
                    name="trackingCode"
                    defaultValue={order.tracking.trackingCode ?? ""}
                    placeholder="e.g. RR123456789PT"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tracking URL (optional)
                  </label>
                  <input
                    name="trackingUrl"
                    defaultValue={order.tracking.trackingUrl ?? ""}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>

                <button className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white">
                  Save
                </button>

                {(order.tracking.trackingCode || order.tracking.trackingUrl) && (
                  <div className="text-xs text-gray-600">
                    <div>
                      <span className="font-semibold">Current:</span>{" "}
                      {order.tracking.trackingCode ?? "—"}
                    </div>
                    {order.tracking.trackingUrl ? (
                      <div className="break-all">
                        <a
                          href={order.tracking.trackingUrl}
                          target="_blank"
                          className="underline"
                        >
                          {order.tracking.trackingUrl}
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}
              </form>
            </section>

            <section className="rounded-2xl border bg-white p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <User2 className="h-4 w-4" /> Customer
              </div>
              <CustomerBlock
                name={order.shipping.fullName ?? order.user?.name ?? null}
                email={order.shipping.email ?? order.user?.email ?? null}
                phone={order.shipping.phone ?? null}
              />
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
                <div className="space-y-3">
                  {order.items.map((it) => (
                    <ItemRow key={it.id} currency={order.currency} item={it} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= UI Bits ========================= */

function LabeledRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-28 shrink-0 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </span>
      <span className="break-all">{value}</span>
    </div>
  );
}

function CustomerBlock({
  name,
  email,
  phone,
}: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="space-y-1">
      <LabeledRow label="Name" value={name ?? "—"} />
      <LabeledRow label="Email" value={email ?? "—"} />
      <LabeledRow label="Phone" value={phone ?? "—"} />
    </div>
  );
}

// ⬇️ Shipping address WITHOUT Name/Email/Phone
function AddressBlock(props: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const cityRegion = [props.city, props.region].filter(Boolean).join(", ");

  return (
    <div className="space-y-1">
      <LabeledRow label="Address" value={props.address1 ?? "—"} />
      {props.address2 ? (
        <LabeledRow label="Address 2" value={props.address2} />
      ) : null}
      <LabeledRow label="City / Region" value={cityRegion || "—"} />
      <LabeledRow label="Postal Code" value={props.postalCode ?? "—"} />
      <LabeledRow label="Country" value={props.country ?? "—"} />
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
    <div className="grid grid-cols-[96px,1fr] gap-3 rounded-xl border p-3">
      <div className="h-24 w-24 overflow-hidden rounded-lg bg-gray-50 border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image || "/placeholder.png"}
          alt={item.name}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium leading-tight truncate">{item.name}</div>
            <div className="text-xs text-gray-500">
              Size: {item.size || "—"} • Qty: {item.qty}
            </div>
          </div>
          <div className="text-right text-sm shrink-0">
            <div>{money(item.unitPriceCents, currency)}</div>
            <div className="font-semibold">
              {money(item.totalPriceCents, currency)}
            </div>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-xs text-gray-700">
          {prettyOptions &&
            prettyOptions.map(([k, v]) => (
              <div key={k} className="break-words">
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
            <div className="break-words">
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
