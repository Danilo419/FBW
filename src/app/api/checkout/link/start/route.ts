// src/app/api/checkout/link/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function totalInCents(o: any): number {
  if (typeof o?.totalCents === "number" && Number.isFinite(o.totalCents)) {
    return Math.max(0, Math.round(o.totalCents));
  }
  const s = Number(o?.subtotal ?? 0);
  const sh = Number(o?.shipping ?? 0);
  const t = Number(o?.tax ?? 0);
  const sum = s + sh + t;
  if (Number.isFinite(sum) && sum > 0) return Math.max(0, Math.round(sum));

  const tot = Number(o?.total ?? 0);
  if (!Number.isFinite(tot) || tot <= 0) return 0;
  return tot < 10000 ? Math.max(0, Math.round(tot * 100)) : Math.max(0, Math.round(tot));
}

function pickReceiptEmail(order: any): string | undefined {
  const fromCols = order?.shippingEmail || order?.user?.email || undefined;
  if (fromCols) return String(fromCols);

  const j = typeof order?.shippingJson === "object" ? order.shippingJson : undefined;
  const email =
    j?.email ?? j?.ship_email ?? j?.contact?.email ?? j?.shipping?.email ?? undefined;

  return email ? String(email) : undefined;
}

/* --------------- route handler --------------- */

export async function POST(req: NextRequest) {
  // Lazy-init Stripe
  let stripe;
  try {
    stripe = getStripe();
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Stripe not configured (missing STRIPE_SECRET_KEY)" },
      { status: 500 }
    );
  }

  try {
    const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { qty: true, unitPrice: true, totalPrice: true } },
        user: { select: { email: true } },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (["paid", "shipped", "delivered"].includes(order.status)) {
      return NextResponse.json({ error: "Order is already finalized" }, { status: 400 });
    }

    const currency = (order.currency || "eur").toLowerCase();
    const amount = totalInCents(order);
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: "Invalid amount for PaymentIntent (must be >= 50 cents)" },
        { status: 400 }
      );
    }

    const receipt_email = pickReceiptEmail(order);

    // Create or update a Link-only PaymentIntent
    let pi;
    if (order.stripePaymentIntentId) {
      // ✅ FIX: remover automatic_payment_methods (não suportado no update para a tua versão)
      pi = await stripe.paymentIntents.update(order.stripePaymentIntentId, {
        amount,
        currency,
        metadata: { orderId },
        receipt_email,
        payment_method_types: ["link"], // força Link-only
      });
    } else {
      pi = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: { orderId },
        receipt_email,
        payment_method_types: ["link"], // Link-only
        capture_method: "automatic",
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: pi.id, status: "pending" },
      });
    }

    if (!pi.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a client_secret for the PaymentIntent." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: pi.client_secret });
  } catch (err: any) {
    console.error("Link start error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to start Link checkout" },
      { status: 400 }
    );
  }
}
