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
  Truck,
  Image as ImageIcon,
} from "lucide-react";
import { PrintButton } from "@/components/admin/PrintButton";
import SupplierCopyCard from "@/components/admin/SupplierCopyCard";
import CustomerCopyCard from "@/components/admin/CustomerCopyCard";
import { sendShipmentEmailAction } from "./actions";

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
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed as Record<string, any>;
      return {};
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

function candidates(keys: string[]) {
  return [keys, ["shipping", ...keys], ["address", ...keys], ["delivery", ...keys]] as string[][];
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

    const j = safeParseJSON(order?.shippingJson);

    const fullNameJson =
      getDeep(j, candidates(["fullName"])) ??
      getDeep(j, candidates(["name"])) ??
      getDeep(j, candidates(["recipient"])) ??
      getDeep(j, candidates(["ship_name"])) ??
      null;

    const emailJson =
      getDeep(j, candidates(["email"])) ??
      getDeep(j, candidates(["ship_email"])) ??
      getDeep(j, candidates(["customer_email"])) ??
      getDeep(j, candidates(["customerEmail"])) ??
      null;

    const phoneJson =
      getDeep(j, candidates(["phone"])) ??
      getDeep(j, candidates(["telephone"])) ??
      getDeep(j, candidates(["ship_phone"])) ??
      getDeep(j, candidates(["customerPhone"])) ??
      null;

    const address1Json =
      getDeep(j, candidates(["address1"])) ??
      getDeep(j, candidates(["addressLine1"])) ??
      getDeep(j, candidates(["line1"])) ??
      getDeep(j, candidates(["street"])) ??
      getDeep(j, candidates(["ship_line1"])) ??
      null;

    const address2Json =
      getDeep(j, candidates(["address2"])) ??
      getDeep(j, candidates(["addressLine2"])) ??
      getDeep(j, candidates(["line2"])) ??
      getDeep(j, candidates(["street2"])) ??
      getDeep(j, candidates(["ship_line2"])) ??
      null;

    const cityJson =
      getDeep(j, candidates(["city"])) ??
      getDeep(j, candidates(["locality"])) ??
      getDeep(j, candidates(["town"])) ??
      getDeep(j, candidates(["ship_city"])) ??
      null;

    const regionJson =
      getDeep(j, candidates(["region"])) ??
      getDeep(j, candidates(["state"])) ??
      getDeep(j, candidates(["province"])) ??
      getDeep(j, candidates(["ship_state"])) ??
      null;

    const postalCodeJson =
      getDeep(j, candidates(["postalCode"])) ??
      getDeep(j, candidates(["postal_code"])) ??
      getDeep(j, candidates(["postcode"])) ??
      getDeep(j, candidates(["zip"])) ??
      getDeep(j, candidates(["zipCode"])) ??
      getDeep(j, candidates(["zipcode"])) ??
      getDeep(j, candidates(["codigoPostal"])) ??
      getDeep(j, candidates(["cep"])) ??
      getDeep(j, candidates(["pincode"])) ??
      getDeep(j, candidates(["eircode"])) ??
      getDeep(j, candidates(["ship_postal"])) ??
      null;

    const countryJson =
      getDeep(j, candidates(["country"])) ??
      getDeep(j, candidates(["countryCode"])) ??
      getDeep(j, candidates(["shippingCountry"])) ??
      getDeep(j, candidates(["ship_country"])) ??
      null;

    const out = {
      fullName: canonical.fullName ?? fullNameJson ?? null,
      email: canonical.email ?? emailJson ?? null,
      phone: canonical.phone ?? phoneJson ?? null,
      address1: canonical.address1 ?? address1Json ?? null,
      address2: canonical.address2 ?? address2Json ?? null,
      city: canonical.city ?? cityJson ?? null,
      region: canonical.region ?? regionJson ?? null,
      postalCode: canonical.postalCode ?? postalCodeJson ?? null,
      country: canonical.country ?? countryJson ?? null,
    };

    if (
      !out.fullName &&
      !out.email &&
      !out.phone &&
      !out.address1 &&
      !out.city &&
      !out.postalCode &&
      !out.country
    ) {
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

    return out;
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
  const trackingCode = pickStr(j, ["trackingCode", "tracking_code", "tracking"]) ?? null;
  const shipmentImageUrl =
    pickStr(j, ["shipmentImageUrl", "shipment_image_url", "shippingImageUrl", "imageUrl"]) ?? null;

  return { trackingCode, shipmentImageUrl };
}

/* ------------------- image helpers (same idea as OrderDetailsClient) ------------------- */

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function normalizeUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}
function getCoverUrl(imageUrls: unknown): string {
  try {
    if (!imageUrls) return "/placeholder.png";

    if (Array.isArray(imageUrls)) {
      const first = String(imageUrls[0] ?? "").trim();
      return normalizeUrl(first) || "/placeholder.png";
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return "/placeholder.png";

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = String(parsed[0] ?? "").trim();
          return normalizeUrl(first) || "/placeholder.png";
        }
      }

      return normalizeUrl(s) || "/placeholder.png";
    }

    if (isRecord(imageUrls)) {
      for (const v of Object.values(imageUrls)) {
        const candidate = getCoverUrl(v);
        if (candidate && candidate !== "/placeholder.png") return candidate;
      }
      return "/placeholder.png";
    }

    return "/placeholder.png";
  } catch {
    return "/placeholder.png";
  }
}

function ensureArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function fallbackId(idx: number, it: any) {
  const base = it?.id ?? it?.orderId ?? it?.productId ?? it?.name ?? "item";
  return `${String(base)}-${idx}`;
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
          // ✅ IMPORTANT: não uses select no item (assim vem snapshotJson/personalizationJson/etc)
          include: {
            // ✅ IMPORTANT: o client usa product.badges
            product: {
              select: { id: true, slug: true, imageUrls: true, name: true, badges: true },
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

    // ✅ CRÍTICO: alinhar os nomes dos campos com o DTO do client:
    // unitPrice, totalPrice, snapshotJson, personalizationJson, product.badges
    const items = itemsRaw.map((it, i) => {
      const cover = getCoverUrl(it?.product?.imageUrls);
      const image = normalizeUrl(String(it?.image ?? cover ?? "/placeholder.png")) || "/placeholder.png";

      const unitPrice = Number(it?.unitPrice ?? 0); // cents
      const totalPrice =
        typeof it?.totalPrice === "number" ? Number(it.totalPrice) : unitPrice * Number(it?.qty ?? 1);

      return {
        // key & basics
        id: String(it?.id ?? fallbackId(i, it)),
        qty: Number(it?.qty ?? 1),
        name: String(it?.name ?? it?.product?.name ?? "Product"),
        image,

        // ✅ nomes esperados pelo teu código "que funciona"
        unitPrice,
        totalPrice,

        // ✅ detalhes
        snapshotJson: it?.snapshotJson ?? null,
        personalizationJson: it?.personalizationJson ?? null,

        // ✅ product com badges (importantíssimo)
        product: {
          id: String(it?.product?.id ?? ""),
          name: String(it?.product?.name ?? it?.name ?? "Product"),
          slug: it?.product?.slug ?? null,
          imageUrls: it?.product?.imageUrls ?? null,
          badges: it?.product?.badges ?? null,
        },
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
          <Link href="/admin" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
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
        {order?.createdAt ? `Created ${new Date(order.createdAt).toLocaleString("en-GB")}` : "Created —"}
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
                The page is still displayed with what we could parse. Error: {error}
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
            <CustomerCopyCard shipping={order.shipping} />

            {/* Shipment Email */}
            <section className="rounded-2xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipment email
                </div>
                <span className="text-xs text-gray-500">Stored in shippingJson</span>
              </div>

              {customerEmail ? (
                <div className="mb-3 rounded-xl border bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>
                      This will email the customer at <span className="font-semibold">{customerEmail}</span>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Customer email not found — you can still save, but the email can’t be sent.
                </div>
              )}

              <form action={sendShipmentEmailAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Tracking code
                  </label>
                  <input
                    name="trackingCode"
                    defaultValue={order.tracking.trackingCode ?? ""}
                    placeholder="e.g. RR123456789PT"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The email will include a 17track link automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Shipment image
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2">
                    <ImageIcon className="h-4 w-4 text-gray-500" />
                    <input type="file" name="shipmentImage" accept="image/*" className="w-full text-sm" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional, but recommended (label / parcel photo / proof).
                  </p>
                </div>

                <button className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white">
                  Send shipment email
                </button>

                {(order.tracking.trackingCode || order.tracking.shipmentImageUrl) && (
                  <div className="rounded-xl border bg-gray-50 p-3 text-xs text-gray-700">
                    <div className="font-semibold mb-1">Current saved</div>
                    <div>
                      <span className="text-gray-500">Tracking:</span>{" "}
                      <span className="font-mono">{order.tracking.trackingCode ?? "—"}</span>
                    </div>
                    {order.tracking.shipmentImageUrl ? (
                      <div className="break-all">
                        <span className="text-gray-500">Image:</span>{" "}
                        <a href={order.tracking.shipmentImageUrl} target="_blank" className="underline">
                          {order.tracking.shipmentImageUrl}
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" /> Items (Copy)
                </div>
                <div className="text-xs text-gray-500">Copy text / image individually</div>
              </div>

              {order.items.length === 0 ? (
                <div className="text-sm text-gray-500">No items.</div>
              ) : (
                <div className="space-y-3">
                  {order.items.map((it: any) => (
                    <SupplierCopyCard key={it.id} item={it} />
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

function LabeledRow({ label, value }: { label: string; value?: string | null }) {
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
      {props.address2 ? <LabeledRow label="Address 2" value={props.address2} /> : null}
      <LabeledRow label="City / Region" value={cityRegion || "—"} />
      <LabeledRow label="Postal Code" value={props.postalCode ?? "—"} />
      <LabeledRow label="Country" value={props.country ?? "—"} />
    </div>
  );
}
