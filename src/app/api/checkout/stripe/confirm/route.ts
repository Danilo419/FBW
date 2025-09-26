import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qOrder = url.searchParams.get("order") || undefined;
    const qSession = url.searchParams.get("session_id") || undefined;
    const body = await req.json().catch(() => ({} as any));
    const orderId = (body.orderId as string) || qOrder;
    const sessionId = (body.sessionId as string) || qSession;

    if (!orderId || !sessionId) {
      return NextResponse.json({ error: "Missing order or session_id" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, status: true, stripeSessionId: true, totalCents: true, currency: true,
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Já pago? devolve ok idempotente
    if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
      return NextResponse.json({ ok: true, status: "already_paid" });
    }

    // Segurança mínima: a sessão tem de corresponder
    if (order.stripeSessionId && order.stripeSessionId !== sessionId) {
      return NextResponse.json({ error: "Session does not match this order" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    // Em alguns métodos pode demorar uns segundos; 202 = tenta novamente
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, status: session.payment_status }, { status: 202 });
    }

    const amountCents =
      typeof session.amount_total === "number" ? session.amount_total : null;
    const currency = (session.currency || "").toUpperCase() || null;
    const pi = session.payment_intent as any;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paymentStatus: "paid",
        paidAt: new Date(),
        stripeSessionId: sessionId,
        stripePaymentIntentId: pi?.id ?? undefined,
        totalCents: amountCents ?? undefined,
        currency: currency ?? undefined,
      },
    });

    // opcional: pós-pagamento (limpar carrinho, emails, etc.)
    try {
      const { finalizePaidOrder } = await import("@/lib/checkout");
      await finalizePaidOrder(orderId);
    } catch {}

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe confirm error" }, { status: 400 });
  }
}
