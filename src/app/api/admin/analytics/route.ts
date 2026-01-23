// src/app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Metric = "visitors" | "sales" | "profit" | "orders" | "conversion";

/* ======================================================================================
   Helpers: dates
====================================================================================== */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function daysBetweenInclusive(a: Date, b: Date) {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  const diff = Math.round((B - A) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

/* ======================================================================================
   Supplier costs (based on product name)
====================================================================================== */
function nrm(s?: string | null) {
  return (s ?? "").toLowerCase().trim();
}

// Shipping do fornecedor: ele disse "T-shirts", mas no teu caso isto é basicamente
// "quantidade de itens de roupa" (menos socks). Se quiseres, posso alterar para contar só jerseys.
function countsForSupplierShipping(name: string) {
  const n = nrm(name);
  if (n.includes("socks")) return false;
  return true;
}

function supplierShippingCostByQty(qty: number): number {
  // 1 -> 5€, 2 -> 4€, 3 -> 3€, 4 -> 2€, 5+ -> 0
  if (qty <= 0) return 0;
  if (qty === 1) return 5;
  if (qty === 2) return 4;
  if (qty === 3) return 3;
  if (qty === 4) return 2;
  return 0;
}

function supplierUnitCostFromName(productName: string): number {
  const n = nrm(productName);

  // ===== Windbreakers =====
  if (n.includes("windbreaker") && (n.includes("with cap") || n.includes("cap")))
    return 28; // Windbreaker with cap
  if (n.includes("windbreaker") && (n.includes("front and back") || n.includes("front/back")))
    return 32; // Front and back windbreakers
  if (n.includes("windbreaker")) return 26;

  // ===== F1 / NBA =====
  if (n.includes("f1") && n.includes("jacket")) return 40;
  if (n.includes("f1")) return 19;
  if (n.includes("nba")) return 16;

  // ===== Pulls =====
  if (n.includes("long pull top")) return 22;
  if (n.includes("long pull")) return 32;
  if (n.includes("half pulled top")) return 16;
  if (n.includes("half pull")) return 25;

  // ===== Training pants =====
  if (n.includes("training pants")) return 16;

  // ===== Socks / Shorts =====
  if (n.includes("football socks") || (n.includes("socks") && n.includes("football")))
    return 3;
  if (n.includes("shorts")) return 8;

  // ===== Sets =====
  if (n.includes("kids kit") || (n.includes("kids") && n.includes("kit")) || (n.includes("children") && n.includes("set")))
    return 12; // Children's set

  if (n.includes("adult set")) return 13;

  // Training tracksuit / training suit set (top+pants)
  if ((n.includes("training tracksuit") || n.includes("training tracksuits") || n.includes("training suit")) && n.includes("set"))
    return 16;

  // Training sleeveless set (tank + shorts)
  if (n.includes("training sleeveless set") || (n.includes("sleeveless") && n.includes("set")))
    return 16; // Tank top training suit

  // ===== Jerseys =====
  // Retro long sleeve (no teu site aparece “Retro ... Long Sleeve Jersey”)
  // Na tua tabela: "Vintage long sleeves: 16€" -> uso aqui para retro long sleeve.
  if (n.includes("retro") && (n.includes("long sleeve") || n.includes("long sleeves")))
    return 16;

  // Retro normal
  if (n.includes("retro")) return 13;

  // Long sleeves (player e fan long sleeves)
  if (n.includes("long sleeve") || n.includes("long sleeves")) return 14;

  // Player version (short sleeve)
  if (n.includes("player version")) return 12;

  // Crop top -> não tinhas na lista; como é basicamente jersey fan, trato como Fans (9€)
  if (n.includes("crop top")) return 9;

  // Fan / standard jerseys
  if (n.includes("fan") || n.includes("fans") || n.includes("jersey")) return 9;

  // fallback seguro
  return 12;
}

/* ======================================================================================
   Money helpers
====================================================================================== */
function toCentsFromOrder(o: {
  totalCents: number | null;
  total: number | null;
  subtotal: number;
  shipping: number;
  tax: number;
}): number {
  if (typeof o.totalCents === "number" && Number.isFinite(o.totalCents)) return o.totalCents;
  if (typeof o.total === "number" && Number.isFinite(o.total)) return Math.round(o.total * 100);
  // fallback: soma subtotal + shipping + tax (tudo em cents)
  return (o.subtotal ?? 0) + (o.shipping ?? 0) + (o.tax ?? 0);
}

function isPaidLike(o: { status: string; paymentStatus: string | null; paidAt: Date | null; paypalCaptured: boolean | null }) {
  const s = (o.status ?? "").toLowerCase();
  const ps = (o.paymentStatus ?? "").toLowerCase();

  // ✅ regra simples e robusta:
  // - se paidAt existe -> conta
  // - ou status é "paid"/"shipped"/"delivered"
  // - ou paymentStatus é "paid"/"succeeded"/"captured"
  if (o.paidAt) return true;
  if (["paid", "shipped", "delivered"].includes(s)) return true;
  if (["paid", "succeeded", "captured"].includes(ps)) return true;
  if (o.paypalCaptured === true) return true;

  return false;
}

/* ======================================================================================
   GET
====================================================================================== */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "30d";

  const today = startOfDay(new Date());
  let from = addDays(today, -29);
  let toExclusive = addDays(today, 1);

  if (period === "today") {
    from = today;
    toExclusive = addDays(today, 1);
  } else if (period === "7d") {
    from = addDays(today, -6);
    toExclusive = addDays(today, 1);
  } else if (period === "30d") {
    from = addDays(today, -29);
    toExclusive = addDays(today, 1);
  } else if (period === "90d") {
    from = addDays(today, -89);
    toExclusive = addDays(today, 1);
  } else if (period === "custom") {
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    if (fromParam) from = startOfDay(new Date(fromParam));
    if (toParam) toExclusive = addDays(startOfDay(new Date(toParam)), 1);
  }

  const totalDays = daysBetweenInclusive(from, addDays(toExclusive, -1));
  const labels: string[] = [];
  for (let i = 0; i < totalDays; i++) labels.push(addDays(from, i).toISOString().slice(0, 10));

  const visitorsByDay = Array(totalDays).fill(0);
  const ordersByDay = Array(totalDays).fill(0);
  const salesByDayEur = Array(totalDays).fill(0);  // euros
  const profitByDayEur = Array(totalDays).fill(0); // euros
  const conversionByDay = Array(totalDays).fill(0);

  function dayIndex(date: Date) {
    const idx = Math.floor(
      (startOfDay(date).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24)
    );
    return idx >= 0 && idx < totalDays ? idx : -1;
  }

  // 1) Visitors (Visit table)
  const visits = await prisma.visit.findMany({
    where: { createdAt: { gte: from, lt: toExclusive } },
    select: { createdAt: true },
  });

  for (const v of visits) {
    const idx = dayIndex(v.createdAt);
    if (idx !== -1) visitorsByDay[idx] += 1;
  }

  // 2) Orders + Profit
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lt: toExclusive } },
    include: { items: true }, // OrderItem[]
    orderBy: { createdAt: "asc" },
  });

  for (const o of orders) {
    if (!isPaidLike(o)) continue;

    const idx = dayIndex(o.createdAt);
    if (idx === -1) continue;

    const totalPaidCents = toCentsFromOrder({
      totalCents: o.totalCents ?? null,
      total: o.total ?? null,
      subtotal: o.subtotal ?? 0,
      shipping: o.shipping ?? 0,
      tax: o.tax ?? 0,
    });

    // custos fornecedor
    let supplierItemsCostEur = 0;
    let shipQty = 0;

    for (const it of o.items) {
      const qty = Math.max(0, Math.floor(it.qty ?? 1));
      const unitCostEur = supplierUnitCostFromName(it.name);
      supplierItemsCostEur += unitCostEur * qty;

      if (countsForSupplierShipping(it.name)) shipQty += qty;
    }

    const supplierShippingEur = supplierShippingCostByQty(shipQty);

    const totalPaidEur = totalPaidCents / 100;
    const profitEur = totalPaidEur - supplierItemsCostEur - supplierShippingEur;

    ordersByDay[idx] += 1;
    salesByDayEur[idx] += totalPaidEur;
    profitByDayEur[idx] += profitEur;
  }

  // 3) Conversion (%)
  for (let i = 0; i < totalDays; i++) {
    const v = visitorsByDay[i];
    const o = ordersByDay[i];
    conversionByDay[i] = v > 0 ? (o / v) * 100 : 0;
  }

  const totals = {
    sales: salesByDayEur.reduce((a: number, b: number) => a + b, 0),
    profit: profitByDayEur.reduce((a: number, b: number) => a + b, 0),
    orders: ordersByDay.reduce((a: number, b: number) => a + b, 0),
    visitors: visitorsByDay.reduce((a: number, b: number) => a + b, 0),
  };

  return NextResponse.json({
    range: { from: from.toISOString(), to: toExclusive.toISOString() },
    labels,
    series: {
      visitors: visitorsByDay,
      sales: salesByDayEur,
      profit: profitByDayEur,
      orders: ordersByDay,
      conversion: conversionByDay,
    } satisfies Record<Metric, number[]>,
    totals,
  });
}
