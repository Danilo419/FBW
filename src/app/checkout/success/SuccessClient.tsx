// src/app/checkout/success/SuccessClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  totalPrice: number; // cents

  // optional rich fields (from /api/account/orders/:id)
  unitPrice?: number | null; // cents
  image?: string | null;
  snapshotJson?: unknown;
  personalizationJson?: unknown;

  product?: {
    id?: string;
    name?: string;
    slug?: string | null;
    imageUrls?: unknown;
    badges?: unknown;
  } | null;
};

type Order = {
  id: string;
  createdAt?: string | Date;
  paidAt?: string | Date | null;
  status: string;
  paymentStatus?: string | null;

  currency?: string | null;

  subtotal?: number | null; // cents
  shipping?: number | null; // cents
  tax?: number | null; // cents
  total?: number | null; // float (legacy)
  totalCents?: number | null; // cents (preferred)

  items: OrderItem[];
};

type ApiResponse =
  | { order: Order }
  | { data: { order: Order } }
  | { error: string }
  | Record<string, any>;

function moneyCents(cents: number | null | undefined, currency = "EUR") {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString(undefined, { style: "currency", currency });
}

const FINAL_STATUSES = new Set(["paid", "shipped", "delivered"]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ========================= Badge labels (same as OrderDetailsClient) ========================= */
const BADGE_LABELS: Record<string, string> = {
  "premier-league-regular": "Premier League – League Badge",
  "premier-league-champions": "Premier League – Champions (Gold)",
  "la-liga-regular": "La Liga – League Badge",
  "la-liga-champions": "La Liga – Champion",
  "serie-a-regular": "Serie A – League Badge",
  "serie-a-scudetto": "Italy – Scudetto (Serie A Champion)",
  "bundesliga-regular": "Bundesliga – League Badge",
  "bundesliga-champions": "Bundesliga – Champion (Meister Badge)",
  "ligue1-regular": "Ligue 1 – League Badge",
  "ligue1-champions": "Ligue 1 – Champion",
  "primeira-liga-regular": "Primeira Liga – League Badge",
  "primeira-liga-champions": "Primeira Liga – Champion",
  "eredivisie-regular": "Eredivisie – League Badge",
  "eredivisie-champions": "Eredivisie – Champion",
  "scottish-premiership-regular": "Scottish Premiership – League Badge",
  "scottish-premiership-champions": "Scottish Premiership – Champion",
  "mls-regular": "MLS – League Badge",
  "mls-champions": "MLS – Champions (MLS Cup Holders)",
  "brasileirao-regular": "Brasileirão – League Badge",
  "brasileirao-champions": "Brasileirão – Champion",
  "super-lig-regular": "Süper Lig – League Badge",
  "super-lig-champions": "Süper Lig – Champion",
  "spl-saudi-regular": "Saudi Pro League – League Badge",
  "spl-saudi-champions": "Saudi Pro League – Champion",
  "ucl-regular": "UEFA Champions League – Starball Badge",
  "ucl-winners": "UEFA Champions League – Winners Badge",
  "uel-regular": "UEFA Europa League – Badge",
  "uel-winners": "UEFA Europa League – Winners Badge",
  "uecl-regular": "UEFA Europa Conference League – Badge",
  "uecl-winners": "UEFA Europa Conference League – Winners Badge",
  "club-world-cup-champions": "FIFA Club World Cup – Champions Badge",
  "intercontinental-cup-champions": "FIFA Intercontinental Cup – Champions Badge",
};

function humanizeBadge(value: string) {
  const key = String(value ?? "").trim();
  if (!key) return "";
  if (BADGE_LABELS[key]) return BADGE_LABELS[key];
  return key
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ------------------------------- image helpers ------------------------------- */
function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}
function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}
function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
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

function getItemImageUrl(it: OrderItem) {
  const direct = normalizeUrl(typeof it.image === "string" ? it.image.trim() : "");
  const cover = getCoverUrl(it.product?.imageUrls);
  return direct || cover || "/placeholder.png";
}

/**
 * External images: use <img> to avoid Next remotePatterns issues.
 */
function ExternalImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || "/placeholder.png");

  useEffect(() => {
    setCurrent(src || "/placeholder.png");
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        setCurrent((prev) =>
          prev === "/placeholder.png" ? prev : "/placeholder.png"
        );
      }}
    />
  );
}

function ItemThumb({ src, alt }: { src: string; alt: string }) {
  const external = isExternalUrl(src);

  if (external) {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-gray-50 shrink-0">
        <ExternalImg src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-xl border bg-gray-50 shrink-0">
      <Image src={src} alt={alt} fill className="object-cover" sizes="56px" />
    </div>
  );
}

/* ========================= detail extraction ========================= */

function safeParseJSON(input: unknown): Record<string, unknown> {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof input === "object") return input as Record<string, unknown>;
  return {};
}

function pickStr(o: unknown, keys: string[]): string | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

/* ✅ badges split */
function splitBadgesString(s: string): string[] {
  const raw = String(s ?? "").trim();
  if (!raw) return [];
  const parts = raw.split(/[,\n;|]+/g).map((x) => x.trim());
  return parts.filter(Boolean);
}

function normalizeBadges(rawBadges: unknown): string[] {
  if (!rawBadges) return [];

  if (Array.isArray(rawBadges)) {
    const out: string[] = [];
    for (const v of rawBadges) {
      if (v == null) continue;
      if (typeof v === "string") out.push(...splitBadgesString(v));
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(",")));
      else out.push(...splitBadgesString(String(v)));
    }
    return out;
  }

  if (isRecord(rawBadges)) {
    const out: string[] = [];
    for (const v of Object.values(rawBadges)) {
      if (v == null) continue;
      if (typeof v === "string") out.push(...splitBadgesString(v));
      else if (isRecord(v)) out.push(...splitBadgesString(Object.values(v).join(",")));
      else out.push(...splitBadgesString(String(v)));
    }
    return out;
  }

  return splitBadgesString(String(rawBadges));
}

function extractPersonalization(
  it: OrderItem,
  snap: Record<string, unknown>,
  optionsObj: Record<string, unknown>
) {
  const snapPers =
    snap?.personalization && typeof snap.personalization === "object"
      ? (snap.personalization as Record<string, unknown>)
      : null;

  const snapPersName = snapPers
    ? pickStr(snapPers, ["name", "playerName", "customName", "shirtName"])
    : null;

  const snapPersNumber = snapPers
    ? pickStr(snapPers, ["number", "playerNumber", "customNumber", "shirtNumber"])
    : null;

  const snapPersJ = safeParseJSON((snap as any)?.personalizationJson);
  const snapJName =
    pickStr(snapPersJ, ["name", "playerName", "customName", "shirtName"]) ?? null;
  const snapJNumber =
    pickStr(snapPersJ, ["number", "playerNumber", "customNumber", "shirtNumber"]) ?? null;

  const itPersJ = safeParseJSON((it as any)?.personalizationJson);
  const itJName =
    pickStr(itPersJ, ["name", "playerName", "customName", "shirtName"]) ?? null;
  const itJNumber =
    pickStr(itPersJ, ["number", "playerNumber", "customNumber", "shirtNumber"]) ?? null;

  const directName =
    pickStr(it as any, [
      "personalizationName",
      "playerName",
      "custName",
      "nameOnShirt",
      "shirtName",
      "customName",
    ]) ?? null;

  const directNumber =
    pickStr(it as any, [
      "personalizationNumber",
      "playerNumber",
      "custNumber",
      "numberOnShirt",
      "shirtNumber",
      "customNumber",
    ]) ?? null;

  const snapRootName =
    pickStr(snap as any, ["custName", "customerName", "nameOnShirt", "shirtName", "playerName"]) ??
    null;
  const snapRootNumber =
    pickStr(snap as any, ["custNumber", "customerNumber", "numberOnShirt", "shirtNumber", "playerNumber"]) ??
    null;

  const optName =
    pickStr(optionsObj as any, ["custName", "playerName", "player_name", "shirtName", "shirt_name", "nameOnShirt"]) ??
    null;

  const optNumber =
    pickStr(optionsObj as any, ["custNumber", "playerNumber", "player_number", "shirtNumber", "shirt_number", "numberOnShirt"]) ??
    null;

  const name =
    (snapPersName ?? snapJName ?? itJName ?? directName ?? snapRootName ?? optName ?? null)?.trim() ||
    null;

  const numRaw =
    (snapPersNumber ?? snapJNumber ?? itJNumber ?? directNumber ?? snapRootNumber ?? optNumber ?? null)?.trim() ||
    "";

  const onlyDigits = String(numRaw).replace(/\D/g, "");
  const number = onlyDigits ? onlyDigits : null;

  if (!name && !number) return null;
  return { name, number };
}

function deriveItemDetails(it: OrderItem) {
  const snap = safeParseJSON(it?.snapshotJson);

  const optionsObj =
    safeParseJSON((snap as any)?.optionsJson) ||
    safeParseJSON((snap as any)?.options) ||
    safeParseJSON((snap as any)?.selected) ||
    {};

  const personalization = extractPersonalization(it, snap, optionsObj);

  const size =
    (optionsObj as any).size ??
    (snap as any)?.size ??
    pickStr(snap, ["sizeLabel", "variant", "skuSize"]) ??
    null;

  const rawBadges =
    (optionsObj as any).badges ??
    (snap as any)?.badges ??
    (optionsObj as any)["competition_badge"] ??
    null;

  const badgesFromSnap = normalizeBadges(rawBadges);
  const badgesFromProduct = normalizeBadges(it?.product?.badges);
  const allBadges = Array.from(new Set([...badgesFromSnap, ...badgesFromProduct])).filter(Boolean);

  const optionsPairs: Array<{ k: string; v: string }> = [];
  for (const [k, v] of Object.entries(optionsObj)) {
    if (v == null || v === "") continue;
    if (k.toLowerCase().includes("json")) continue;

    let vs = "";
    if (Array.isArray(v)) vs = v.join(", ");
    else if (isRecord(v)) vs = Object.values(v).join(", ");
    else vs = String(v);

    vs = vs.trim();
    if (!vs) continue;

    if (k.toLowerCase() === "badges") continue;
    if (k.toLowerCase() === "size") continue;

    optionsPairs.push({ k, v: vs });
  }

  return { size, personalization, badges: allBadges, optionsPairs };
}

function prettyKey(k: string) {
  const map: Record<string, string> = {
    custName: "Name",
    custNumber: "Number",
    nameOnShirt: "Name",
    numberOnShirt: "Number",
    playerName: "Name",
    playerNumber: "Number",
  };
  if (map[k]) return map[k];

  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ========================= Component ========================= */

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const confirmingRef = useRef(false);

  const { orderId, provider, sessionId } = useMemo(() => {
    const id = params.get("order") || "";
    const prov = params.get("provider") || "";
    const sess = params.get("session_id") || "";
    return { orderId: id, provider: prov, sessionId: sess };
  }, [params]);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading your order…");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Confirma Stripe no servidor usando o session_id devolvido pelo Checkout */
  const confirmStripe = async (oid: string, sid: string) => {
    if (!oid || !sid || confirmingRef.current) return;
    confirmingRef.current = true;
    setLoading(true);
    setLoadingMsg("Finalizing your payment…");

    const MAX_TRIES = 6;
    for (let i = 0; i < MAX_TRIES; i++) {
      try {
        const res = await fetch(
          `/api/checkout/stripe/confirm?order=${encodeURIComponent(
            oid
          )}&session_id=${encodeURIComponent(sid)}`,
          { method: "POST" }
        );

        const json: any = await res.json().catch(() => ({}));

        if (res.ok && json?.ok) return;

        if (res.status === 202 || json?.status === "processing") {
          await wait(1500);
          continue;
        }

        setError(json?.error || "Could not confirm the payment.");
        break;
      } catch {
        await wait(1200);
      }
    }
  };

  /**
   * ✅ Carrega a encomenda do MESMO endpoint "rico" que já funciona:
   * /api/account/orders/:id
   */
  const fetchOrder = async (oid: string) => {
    if (!oid) {
      setLoading(false);
      setOrder(null);
      return;
    }

    setLoading(true);
    setLoadingMsg("Loading your order…");
    setError(null);

    try {
      const res = await fetch(`/api/account/orders/${encodeURIComponent(oid)}`, {
        method: "GET",
        cache: "no-store",
      });

      const json: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

      if (!res.ok) {
        const msg =
          (json as any)?.error ||
          "Could not load the order. Please check again in your account.";
        setError(msg);
        setOrder(null);
        return;
      }

      const o: Order | undefined = (json as any)?.order ?? (json as any)?.data?.order;

      if (o && o.id) {
        setOrder(o);

        // optional small refresh if still not final
        if (!FINAL_STATUSES.has((o.status || "").toLowerCase())) {
          for (let i = 0; i < 2; i++) {
            await wait(1500);
            const again = await fetch(`/api/account/orders/${encodeURIComponent(oid)}`, {
              cache: "no-store",
            }).then((r) => r.json().catch(() => ({})));

            const updated: Order | undefined =
              (again as any)?.order ?? (again as any)?.data?.order;

            if (updated?.id) {
              setOrder(updated);
              if (FINAL_STATUSES.has((updated.status || "").toLowerCase())) break;
            }
          }
        }
      } else {
        setError("Order not found.");
        setOrder(null);
      }
    } catch {
      setError("Network error while loading the order.");
      setOrder(null);
    } finally {
      setLoading(false);
      setLoadingMsg("Loading your order…");
    }
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      if (provider === "stripe" && sessionId) {
        await confirmStripe(orderId, sessionId);
      }

      if (!alive) return;
      await fetchOrder(orderId);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, provider, sessionId]);

  const currency = useMemo(() => (order?.currency || "eur").toUpperCase(), [order?.currency]);

  const computedTotalCents = useMemo(() => {
    if (!order) return 0;
    if (typeof order.totalCents === "number") return order.totalCents;
    if (typeof order.total === "number") return Math.round(order.total * 100);

    const itemsSum =
      order.items?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;

    const shipping = order.shipping || 0;
    const tax = order.tax || 0;
    return itemsSum + shipping + tax;
  }, [order]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">
        {loadingMsg}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <p className="text-sm text-red-700 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => router.replace("/account")}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Go to my account
          </button>
          <button
            onClick={() => router.replace("/")}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <p className="text-sm text-gray-800">
        Your payment was successful{provider ? ` via ${provider}` : ""}.
      </p>

      {order ? (
        <>
          <div className="text-sm">
            <div className="text-gray-500">Order</div>
            <div className="font-mono break-all">{order.id}</div>
            <div className="mt-1 text-gray-500">Status</div>
            <div className="font-semibold capitalize">{order.status}</div>
          </div>

          <ul className="divide-y rounded-xl border">
            {order.items?.map((it) => {
              const img = getItemImageUrl(it);
              const details = deriveItemDetails(it);

              const unit =
                typeof it.unitPrice === "number" && it.unitPrice > 0
                  ? it.unitPrice
                  : typeof it.totalPrice === "number" && it.qty > 0
                    ? Math.round(it.totalPrice / it.qty)
                    : 0;

              return (
                <li key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <ItemThumb src={img} alt={it.name} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        <div className="text-sm text-gray-600">
                          Qty: {it.qty}
                          <span className="mx-2">·</span>
                          {moneyCents(unit, currency)} each
                        </div>
                      </div>
                    </div>

                    <div className="font-semibold shrink-0">
                      {moneyCents(it.totalPrice, currency)}
                    </div>
                  </div>

                  {(details.size ||
                    details.personalization?.name ||
                    details.personalization?.number ||
                    details.optionsPairs.length > 0 ||
                    details.badges.length > 0) && (
                      <div className="mt-3 pl-[68px] space-y-2">
                        {(details.size ||
                          details.personalization?.name ||
                          details.personalization?.number) && (
                            <div className="text-sm text-gray-700 space-y-0.5">
                              {details.size ? (
                                <div>
                                  <span className="text-gray-500">Size:</span>{" "}
                                  {details.size}
                                </div>
                              ) : null}

                              {details.personalization ? (
                                <div>
                                  <span className="text-gray-500">
                                    Personalization:
                                  </span>{" "}
                                  {details.personalization.name
                                    ? details.personalization.name
                                    : "—"}
                                  {details.personalization.number
                                    ? ` · #${details.personalization.number}`
                                    : ""}
                                </div>
                              ) : null}
                            </div>
                          )}

                        {details.optionsPairs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {details.optionsPairs.map((p, idx) => (
                              <span
                                key={`${p.k}-${idx}`}
                                className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                title={p.k}
                              >
                                <span className="text-gray-500">
                                  {prettyKey(p.k)}:
                                </span>{" "}
                                {p.v}
                              </span>
                            ))}
                          </div>
                        )}

                        {details.badges.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">
                              Badges:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {details.badges.map((b, idx) => (
                                <span
                                  key={`${b}-${idx}`}
                                  className="text-xs px-2 py-1 rounded-full border bg-white max-w-full break-words"
                                  title={b}
                                >
                                  {humanizeBadge(b)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </li>
              );
            })}
          </ul>

          <div className="text-right font-bold">
            Total: {moneyCents(computedTotalCents, currency)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                router.replace(`/orders/${encodeURIComponent(order.id)}`)
              }
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              View order
            </button>
            <button
              onClick={() => router.replace("/")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Continue shopping
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Order processed. You can check the details in your account.</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.replace("/account")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Go to my account
            </button>
            <button
              onClick={() => router.replace("/")}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Home
            </button>
          </div>
        </>
      )}
    </div>
  );
}
