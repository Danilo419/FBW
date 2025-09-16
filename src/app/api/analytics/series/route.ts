// src/app/api/analytics/series/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

type Metric = "visitors" | "sales" | "orders" | "conversion";
type Granularity = "day" | "hour";

/* ---------------- helpers de datas/buckets ---------------- */

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function toKey(d: Date, granularity: Granularity): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  if (granularity === "hour") {
    const h = pad2(d.getHours());
    return `${y}-${m}-${day}T${h}:00`; // chave por hora
  }
  return `${y}-${m}-${day}`; // chave por dia
}

function parseRange(url: URL) {
  const period = (url.searchParams.get("period") || "30d").toLowerCase();
  const now = new Date();
  let from: Date;
  let to: Date = now;
  let granularity: Granularity = "day";

  if (period === "today" || period === "1d") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    granularity = "hour";
  } else if (period === "7d") {
    from = new Date(now.getTime() - 7 * 86400000);
  } else if (period === "30d") {
    from = new Date(now.getTime() - 30 * 86400000);
  } else if (period === "90d") {
    from = new Date(now.getTime() - 90 * 86400000);
  } else if (period === "custom") {
    const f = url.searchParams.get("from");
    const t = url.searchParams.get("to");
    from = f ? new Date(f) : new Date(now.getTime() - 30 * 86400000);
    to = t ? new Date(t) : now;
  } else {
    from = new Date(now.getTime() - 30 * 86400000);
  }

  const start =
    granularity === "hour"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      : new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);

  const end =
    granularity === "hour"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      : new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);

  return { start, end, granularity };
}

function buildBuckets(start: Date, end: Date, granularity: Granularity) {
  const keys: string[] = [];
  const cursor = new Date(start);
  if (granularity === "hour") {
    for (let h = 0; h < 24; h++) {
      cursor.setHours(h, 0, 0, 0);
      keys.push(toKey(cursor, "hour"));
    }
  } else {
    while (cursor <= end) {
      keys.push(toKey(cursor, "day"));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return keys;
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

// “Pago” aproximado: status ou marcadores Stripe/PayPal
function paidLikeFilter(start: Date, end: Date): Prisma.OrderWhereInput {
  return {
    createdAt: { gte: start, lte: end },
    OR: [
      { status: { in: ["PAID", "paid", "COMPLETED", "SHIPPED"] } as any },
      { paypalCaptured: true as any },
      { stripePaymentIntentId: { not: null } as any },
      { stripeSessionId: { not: null } as any },
    ],
  };
}

/* ---------------- handler ---------------- */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const metric = (url.searchParams.get("metric") || "visitors") as Metric;
  const { start, end, granularity } = parseRange(url);

  const keys = buildBuckets(start, end, granularity);
  const series = keys.map((k) => ({ date: k, value: 0 }));
  const keyToIndex = new Map(keys.map((k, i) => [k, i]));

  // ---------- VISITORS ----------
  if (metric === "visitors") {
    const visits = await prisma.visit.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, visitorId: true },
      orderBy: { createdAt: "asc" },
    });

    const uniqPerBucket: Record<string, Set<string>> = {};
    for (const v of visits) {
      const k = toKey(v.createdAt, granularity);
      (uniqPerBucket[k] ??= new Set()).add(v.visitorId);
    }
    for (const [k, set] of Object.entries(uniqPerBucket)) {
      const i = keyToIndex.get(k);
      if (i != null) series[i].value = set.size;
    }

    const totalUniqueVisitors = new Set(visits.map((v) => v.visitorId)).size;
    return NextResponse.json({ series, total: totalUniqueVisitors, granularity });
  }

  // ---------- ORDERS / SALES ----------
  if (metric === "orders" || metric === "sales") {
    const paid = await prisma.order.findMany({
      where: paidLikeFilter(start, end),
      select: {
        createdAt: true,
        total: true,
        totalCents: true,
        subtotal: true,
        shipping: true,
        tax: true,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const o of paid) {
      const k = toKey(o.createdAt, granularity);
      const i = keyToIndex.get(k);
      if (i == null) continue;
      if (metric === "orders") series[i].value += 1;
      else series[i].value += normalizeTotal(o);
    }

    const total =
      metric === "orders"
        ? paid.length
        : paid.reduce((a, b) => a + normalizeTotal(b), 0);

    return NextResponse.json({ series, total, granularity });
  }

  // ---------- CONVERSION: % por bucket + média dos buckets ----------
  if (metric === "conversion") {
    // 1) visitantes únicos por bucket
    const visits = await prisma.visit.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, visitorId: true },
      orderBy: { createdAt: "asc" },
    });
    const uniqVisitorsPerBucket: Record<string, Set<string>> = {};
    for (const v of visits) {
      const k = toKey(v.createdAt, granularity);
      (uniqVisitorsPerBucket[k] ??= new Set()).add(v.visitorId);
    }

    // 2) encomendas por bucket + compradores únicos (fallback de denominador)
    const orders = await prisma.order.findMany({
      where: paidLikeFilter(start, end),
      select: { createdAt: true, userId: true, sessionId: true, id: true },
      orderBy: { createdAt: "asc" },
    });
    const ordersPerBucket: Record<string, number> = {};
    const buyersPerBucket: Record<string, Set<string>> = {};
    for (const o of orders) {
      const k = toKey(o.createdAt, granularity);
      ordersPerBucket[k] = (ordersPerBucket[k] ?? 0) + 1;
      const buyerKey = o.userId ?? o.sessionId ?? o.id; // melhor esforço
      (buyersPerBucket[k] ??= new Set()).add(String(buyerKey));
    }

    // 3) taxa por bucket: orders / max(uniqVisitors, uniqBuyers) * 100
    let sumRates = 0;
    let bucketsConsidered = 0;

    for (const s of series) {
      const k = s.date;
      const visitors = (uniqVisitorsPerBucket[k]?.size ?? 0);
      const uniqBuyers = (buyersPerBucket[k]?.size ?? 0);
      const denom = Math.max(visitors, uniqBuyers); // fallback para dados antigos sem visitas
      const ord = ordersPerBucket[k] ?? 0;

      s.value = denom > 0 ? (ord / denom) * 100 : 0;

      if (denom > 0) {
        sumRates += s.value;
        bucketsConsidered += 1;
      }
    }

    const average = bucketsConsidered > 0 ? sumRates / bucketsConsidered : 0;

    return NextResponse.json({ series, average, granularity });
  }

  return NextResponse.json({ series: [], total: 0, granularity });
}
