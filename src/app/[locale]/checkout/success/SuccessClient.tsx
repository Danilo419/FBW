"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  totalPrice: number; // cents

  unitPrice?: number | null; // cents
  image?: string | null;
  snapshotJson?: unknown;

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
  status: string;

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
  | { ok?: boolean; status?: string }
  | { error: string }
  | Record<string, any>;

function moneyCents(cents: number | null | undefined, currency = "EUR", locale = "pt-PT") {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString(locale, { style: "currency", currency });
}

const FINAL_STATUSES = new Set(["paid", "shipped", "delivered"]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ========================= Badge labels ========================= */
const BADGE_LABELS: Record<string, { en: string; pt: string }> = {
  "premier-league-regular": {
    en: "Premier League – League Badge",
    pt: "Premier League – Emblema da Liga",
  },
  "premier-league-champions": {
    en: "Premier League – Champions (Gold)",
    pt: "Premier League – Campeão (Dourado)",
  },
  "la-liga-regular": {
    en: "La Liga – League Badge",
    pt: "La Liga – Emblema da Liga",
  },
  "la-liga-champions": {
    en: "La Liga – Champion",
    pt: "La Liga – Campeão",
  },
  "serie-a-regular": {
    en: "Serie A – League Badge",
    pt: "Serie A – Emblema da Liga",
  },
  "serie-a-scudetto": {
    en: "Italy – Scudetto (Serie A Champion)",
    pt: "Itália – Scudetto (Campeão da Serie A)",
  },
  "bundesliga-regular": {
    en: "Bundesliga – League Badge",
    pt: "Bundesliga – Emblema da Liga",
  },
  "bundesliga-champions": {
    en: "Bundesliga – Champion (Meister Badge)",
    pt: "Bundesliga – Campeão (Emblema Meister)",
  },
  "ligue1-regular": {
    en: "Ligue 1 – League Badge",
    pt: "Ligue 1 – Emblema da Liga",
  },
  "ligue1-champions": {
    en: "Ligue 1 – Champion",
    pt: "Ligue 1 – Campeão",
  },
  "primeira-liga-regular": {
    en: "Primeira Liga – League Badge",
    pt: "Primeira Liga – Emblema da Liga",
  },
  "primeira-liga-champions": {
    en: "Primeira Liga – Champion",
    pt: "Primeira Liga – Campeão",
  },
  "eredivisie-regular": {
    en: "Eredivisie – League Badge",
    pt: "Eredivisie – Emblema da Liga",
  },
  "eredivisie-champions": {
    en: "Eredivisie – Champion",
    pt: "Eredivisie – Campeão",
  },
  "scottish-premiership-regular": {
    en: "Scottish Premiership – League Badge",
    pt: "Scottish Premiership – Emblema da Liga",
  },
  "scottish-premiership-champions": {
    en: "Scottish Premiership – Champion",
    pt: "Scottish Premiership – Campeão",
  },
  "mls-regular": {
    en: "MLS – League Badge",
    pt: "MLS – Emblema da Liga",
  },
  "mls-champions": {
    en: "MLS – Champions (MLS Cup Holders)",
    pt: "MLS – Campeões (Vencedores da MLS Cup)",
  },
  "brasileirao-regular": {
    en: "Brasileirão – League Badge",
    pt: "Brasileirão – Emblema da Liga",
  },
  "brasileirao-champions": {
    en: "Brasileirão – Champion",
    pt: "Brasileirão – Campeão",
  },
  "super-lig-regular": {
    en: "Süper Lig – League Badge",
    pt: "Süper Lig – Emblema da Liga",
  },
  "super-lig-champions": {
    en: "Süper Lig – Champion",
    pt: "Süper Lig – Campeão",
  },
  "spl-saudi-regular": {
    en: "Saudi Pro League – League Badge",
    pt: "Saudi Pro League – Emblema da Liga",
  },
  "spl-saudi-champions": {
    en: "Saudi Pro League – Champion",
    pt: "Saudi Pro League – Campeão",
  },
  "ucl-regular": {
    en: "UEFA Champions League – Starball Badge",
    pt: "UEFA Champions League – Emblema Starball",
  },
  "ucl-winners": {
    en: "UEFA Champions League – Winners Badge",
    pt: "UEFA Champions League – Emblema de Vencedor",
  },
  "uel-regular": {
    en: "UEFA Europa League – Badge",
    pt: "UEFA Europa League – Emblema",
  },
  "uel-winners": {
    en: "UEFA Europa League – Winners Badge",
    pt: "UEFA Europa League – Emblema de Vencedor",
  },
  "uecl-regular": {
    en: "UEFA Europa Conference League – Badge",
    pt: "UEFA Europa Conference League – Emblema",
  },
  "uecl-winners": {
    en: "UEFA Europa Conference League – Winners Badge",
    pt: "UEFA Europa Conference League – Emblema de Vencedor",
  },
  "club-world-cup-champions": {
    en: "FIFA Club World Cup – Champions Badge",
    pt: "FIFA Club World Cup – Emblema de Campeão",
  },
  "intercontinental-cup-champions": {
    en: "FIFA Intercontinental Cup – Champions Badge",
    pt: "FIFA Intercontinental Cup – Emblema de Campeão",
  },
};

function humanizeBadge(value: string, locale: "pt" | "en") {
  const key = String(value ?? "").trim();
  if (!key) return "";

  const mapped = BADGE_LABELS[key];
  if (mapped) return mapped[locale];

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

function ItemThumb({ src, alt }: { src: string; alt: string }) {
  const normalizedSrc = src || "/placeholder.png";

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes="56px"
        unoptimized={isExternalUrl(normalizedSrc)}
      />
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

function splitBadgesString(s: string): string[] {
  const raw = String(s ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/[,\n;|]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
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
    snap.personalization && typeof snap.personalization === "object"
      ? (snap.personalization as Record<string, unknown>)
      : null;

  const snapPersName = snapPers
    ? pickStr(snapPers, ["name", "playerName", "customName", "shirtName"])
    : null;
  const snapPersNumber = snapPers
    ? pickStr(snapPers, ["number", "playerNumber", "customNumber", "shirtNumber"])
    : null;

  const directName =
    pickStr(it, [
      "personalizationName",
      "playerName",
      "custName",
      "nameOnShirt",
      "shirtName",
      "customName",
    ]) ?? null;

  const directNumber =
    pickStr(it, [
      "personalizationNumber",
      "playerNumber",
      "custNumber",
      "numberOnShirt",
      "shirtNumber",
      "customNumber",
    ]) ?? null;

  const snapRootName =
    pickStr(snap, ["custName", "customerName", "nameOnShirt", "shirtName", "playerName"]) ?? null;

  const snapRootNumber =
    pickStr(snap, ["custNumber", "customerNumber", "numberOnShirt", "shirtNumber", "playerNumber"]) ??
    null;

  const optName =
    pickStr(optionsObj, [
      "custName",
      "playerName",
      "player_name",
      "shirtName",
      "shirt_name",
      "nameOnShirt",
    ]) ?? null;

  const optNumber =
    pickStr(optionsObj, [
      "custNumber",
      "playerNumber",
      "player_number",
      "shirtNumber",
      "shirt_number",
      "numberOnShirt",
    ]) ?? null;

  const name = (snapPersName ?? directName ?? snapRootName ?? optName ?? null)?.trim() || null;
  const numRaw = (snapPersNumber ?? directNumber ?? snapRootNumber ?? optNumber ?? null)?.trim() || "";

  const onlyDigits = String(numRaw).replace(/\D/g, "");
  const number = onlyDigits ? onlyDigits : null;

  if (!name && !number) return null;
  return { name, number };
}

function prettyKey(k: string, t: ReturnType<typeof useTranslations>) {
  const map: Record<string, string> = {
    custName: t("optionLabels.name"),
    custNumber: t("optionLabels.number"),
    nameOnShirt: t("optionLabels.name"),
    numberOnShirt: t("optionLabels.number"),
    playerName: t("optionLabels.name"),
    playerNumber: t("optionLabels.number"),
  };

  if (map[k]) return map[k];

  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function deriveItemDetails(it: OrderItem) {
  const snap = safeParseJSON(it.snapshotJson);

  const optionsJson = snap.optionsJson;
  const options = snap.options;
  const selected = snap.selected;

  const optionsObj = {
    ...safeParseJSON(optionsJson),
    ...safeParseJSON(options),
    ...safeParseJSON(selected),
  };

  const personalization = extractPersonalization(it, snap, optionsObj);

  const size =
    optionsObj.size ??
    snap.size ??
    pickStr(snap, ["sizeLabel", "variant", "skuSize"]) ??
    null;

  const rawBadges = optionsObj.badges ?? snap.badges ?? optionsObj["competition_badge"] ?? null;

  const badgesFromSnap = normalizeBadges(rawBadges);
  const badgesFromProduct = normalizeBadges(it.product?.badges);
  const badges = Array.from(new Set([...badgesFromSnap, ...badgesFromProduct])).filter(Boolean);

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

  return { size, personalization, badges, optionsPairs };
}

/* ========================= locale helpers ========================= */

function normalizeLocale(locale: string): "pt" | "en" {
  return locale === "en" ? "en" : "pt";
}

function withLocale(locale: string, path: string) {
  const safeLocale = normalizeLocale(locale);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${safeLocale}${cleanPath}`;
}

function getIntlLocale(locale: "pt" | "en") {
  return locale === "pt" ? "pt-PT" : "en-US";
}

/* ========================= Component ========================= */

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const rawLocale = useLocale();
  const locale = normalizeLocale(rawLocale);
  const intlLocale = getIntlLocale(locale);
  const t = useTranslations("SuccessPage");
  const confirmingRef = useRef(false);

  const { orderId, provider, sessionId } = useMemo(() => {
    const id = params.get("order") || "";
    const prov = params.get("provider") || "";
    const sess = params.get("session_id") || "";
    return { orderId: id, provider: prov, sessionId: sess };
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(t("loadingOrder"));
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingMsg(t("loadingOrder"));
  }, [t]);

  const confirmStripe = useCallback(
    async (oid: string, sid: string) => {
      if (!oid || !sid || confirmingRef.current) return;
      confirmingRef.current = true;
      setLoading(true);
      setLoadingMsg(t("finalizingPayment"));

      const MAX_TRIES = 6;

      for (let i = 0; i < MAX_TRIES; i++) {
        try {
          const res = await fetch(
            `/api/checkout/stripe/confirm?order=${encodeURIComponent(oid)}&session_id=${encodeURIComponent(sid)}`,
            { method: "POST" }
          );

          const json: any = await res.json().catch(() => ({}));

          if (res.ok && json?.ok) return true;

          if (res.status === 202 || json?.status === "processing") {
            await wait(1500);
            continue;
          }

          setError(json?.error || t("errors.couldNotConfirmPayment"));
          return false;
        } catch {
          await wait(1200);
        }
      }

      return false;
    },
    [t]
  );

  const fetchOrder = useCallback(
    async (oid: string, sid: string) => {
      if (!oid) {
        setLoading(false);
        setOrder(null);
        return;
      }

      setLoading(true);
      setError(null);
      setLoadingMsg(t("loadingOrder"));

      try {
        if (sid) {
          const MAX_TRIES = 8;
          let lastOrder: Order | null = null;

          for (let i = 0; i < MAX_TRIES; i++) {
            const res = await fetch(
              `/api/checkout/success/order?order=${encodeURIComponent(oid)}&session_id=${encodeURIComponent(sid)}`,
              { method: "GET", cache: "no-store" }
            );

            if (res.status === 202) {
              setLoadingMsg(t("finalizingPayment"));
              await wait(1200);
              continue;
            }

            const json: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

            if (!res.ok) {
              setError((json as any)?.error || t("errors.couldNotLoadOrder"));
              setOrder(null);
              return;
            }

            const o: Order | undefined = (json as any)?.order ?? (json as any)?.data?.order;

            if (!o?.id) {
              setError(t("errors.orderNotFound"));
              setOrder(null);
              return;
            }

            lastOrder = o;
            setOrder(o);

            if (!FINAL_STATUSES.has((o.status || "").toLowerCase())) {
              await wait(900);
              continue;
            }

            return;
          }

          if (!lastOrder) {
            setError(t("errors.paymentStillProcessing"));
          }

          return;
        }

        let res = await fetch(`/api/orders/${encodeURIComponent(oid)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          res = await fetch(`/api/orders?id=${encodeURIComponent(oid)}`, {
            method: "GET",
            cache: "no-store",
          });
        }

        const json: ApiResponse = await res.json().catch(() => ({} as ApiResponse));

        if (!res.ok) {
          setError((json as any)?.error || t("errors.couldNotLoadOrder"));
          setOrder(null);
          return;
        }

        const o: Order | undefined = (json as any)?.order ?? (json as any)?.data?.order;

        if (!o?.id) {
          setError(t("errors.orderNotFound"));
          setOrder(null);
          return;
        }

        setOrder(o);
      } catch {
        setError(t("errors.networkErrorLoadingOrder"));
        setOrder(null);
      } finally {
        setLoading(false);
        setLoadingMsg(t("loadingOrder"));
      }
    },
    [t]
  );

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      if (provider === "stripe" && sessionId) {
        await confirmStripe(orderId, sessionId);
      }

      if (!alive) return;
      await fetchOrder(orderId, provider === "stripe" ? sessionId : "");
    };

    run();

    return () => {
      alive = false;
    };
  }, [confirmStripe, fetchOrder, orderId, provider, sessionId]);

  const currency = useMemo(() => (order?.currency || "eur").toUpperCase(), [order?.currency]);

  const computedTotalCents = useMemo(() => {
    if (!order) return 0;
    if (typeof order.totalCents === "number") return order.totalCents;
    if (typeof order.total === "number") return Math.round(order.total * 100);

    const itemsSum = order.items?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) || 0;
    return itemsSum + (order.shipping || 0) + (order.tax || 0);
  }, [order]);

  if (loading) {
    return <div className="rounded-2xl border bg-white p-5 text-center">{loadingMsg}</div>;
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-5">
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => router.replace(withLocale(locale, "/account"))}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            {t("goToMyAccount")}
          </button>
          <button
            onClick={() => router.replace(withLocale(locale, "/"))}
            className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            {t("continueShopping")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-5">
      <p className="text-sm text-gray-800">
        {t("paymentSuccessful")}
        {provider ? ` ${t("via")} ${provider}` : ""}
        .
      </p>

      {order ? (
        <>
          <div className="text-sm">
            <div className="text-gray-500">{t("order")}</div>
            <div className="break-all font-mono">{order.id}</div>

            <div className="mt-1 text-gray-500">{t("status")}</div>
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
                    <div className="flex min-w-0 items-start gap-3">
                      <ItemThumb src={img} alt={it.name} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{it.name}</div>
                        <div className="text-sm text-gray-600">
                          {t("qty")}: {it.qty}
                          <span className="mx-2">·</span>
                          {moneyCents(unit, currency, intlLocale)} {t("each")}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 font-semibold">
                      {moneyCents(it.totalPrice, currency, intlLocale)}
                    </div>
                  </div>

                  {(details.size ||
                    details.personalization?.name ||
                    details.personalization?.number ||
                    details.optionsPairs.length > 0 ||
                    details.badges.length > 0) && (
                    <div className="mt-3 space-y-2 pl-[68px]">
                      {(details.size ||
                        details.personalization?.name ||
                        details.personalization?.number) && (
                        <div className="space-y-0.5 text-sm text-gray-700">
                          {details.size ? (
                            <div>
                              <span className="text-gray-500">{t("size")}:</span> {String(details.size)}
                            </div>
                          ) : null}

                          {details.personalization ? (
                            <div>
                              <span className="text-gray-500">{t("personalization")}:</span>{" "}
                              {details.personalization.name ? details.personalization.name : t("dash")}
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
                              className="max-w-full break-words rounded-full border bg-white px-2 py-1 text-xs"
                              title={p.k}
                            >
                              <span className="text-gray-500">{prettyKey(p.k, t)}:</span> {p.v}
                            </span>
                          ))}
                        </div>
                      )}

                      {details.badges.length > 0 && (
                        <div>
                          <div className="mb-1 text-xs font-semibold text-gray-500">{t("badges")}:</div>
                          <div className="flex flex-wrap gap-2">
                            {details.badges.map((b, idx) => (
                              <span
                                key={`${b}-${idx}`}
                                className="max-w-full break-words rounded-full border bg-white px-2 py-1 text-xs"
                                title={b}
                              >
                                {humanizeBadge(b, locale)}
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
            {t("total")}: {moneyCents(computedTotalCents, currency, intlLocale)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                router.replace(withLocale(locale, `/orders/${encodeURIComponent(order.id)}`))
              }
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              {t("viewOrder")}
            </button>
            <button
              onClick={() => router.replace(withLocale(locale, "/"))}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              {t("continueShopping")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{t("orderProcessedCheckAccount")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.replace(withLocale(locale, "/account"))}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              {t("goToMyAccount")}
            </button>
            <button
              onClick={() => router.replace(withLocale(locale, "/"))}
              className="w-full rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              {t("home")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}