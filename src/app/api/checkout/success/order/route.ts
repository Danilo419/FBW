// src/app/api/checkout/success/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order") || "";
    const sessionId = url.searchParams.get("session_id") || "";

    if (!orderId || !sessionId) {
      return NextResponse.json({ error: "Missing order or session_id" }, { status: 400 });
    }

    // 1) DB check (and if order already has stripeSessionId saved, it must match)
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, stripeSessionId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existing.stripeSessionId && existing.stripeSessionId !== sessionId) {
      return NextResponse.json({ error: "Session does not match this order" }, { status: 400 });
    }

    // 2) Stripe session check
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer"],
    });

    const metaOrderId = (session.metadata as any)?.orderId as string | undefined;
    if (metaOrderId && metaOrderId !== orderId) {
      return NextResponse.json({ error: "Session metadata does not match this order" }, { status: 400 });
    }

    // If not paid yet, let client retry (same behavior you already use)
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, status: session.payment_status }, { status: 202 });
    }

    // 3) Return “rich” order details (schema-compatible)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            qty: true,
            unitPrice: true,
            totalPrice: true,
            name: true,
            image: true,
            snapshotJson: true, // ✅ exists in your schema
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true,
                badges: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load success order" },
      { status: 400 }
    );
  }
}
