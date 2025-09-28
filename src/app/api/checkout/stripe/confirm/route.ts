// src/app/api/checkout/stripe/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --------------------------- helpers --------------------------- */

type ShippingJson =
  | {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      address?:
        | {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null; // ISO-3166 alpha-2
          }
        | null;
    }
  | null;

const nz = (v: unknown) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
};

const isFinal = (s?: string | null) =>
  (s ?? "").toLowerCase() === "paid" ||
  (s ?? "").toLowerCase() === "shipped" ||
  (s ?? "").toLowerCase() === "delivered";

function prefer<A>(primary: A | null | undefined, fallback: A | null | undefined): A | null {
  return primary != null && !(typeof primary === "string" && primary.trim() === "")
    ? (primary as A)
    : (fallback ?? null);
}

function mergeShipping(base: ShippingJson, add: ShippingJson): ShippingJson {
  if (!base && !add) return null;
  if (!base) return add ?? null;
  if (!add) return base ?? null;

  return {
    name: prefer(base.name, add.name),
    phone: prefer(base.phone, add.phone),
    email: prefer(base.email, add.email),
    address: {
      line1: prefer(base.address?.line1 ?? null, add.address?.line1 ?? null),
      line2: prefer(base.address?.line2 ?? null, add.address?.line2 ?? null),
      city: prefer(base.address?.city ?? null, add.address?.city ?? null),
      state: prefer(base.address?.state ?? null, add.address?.state ?? null),
      postal_code: prefer(base.address?.postal_code ?? null, add.address?.postal_code ?? null),
      country: prefer(base.address?.country ?? null, add.address?.country ?? null),
    },
  };
}

/** Converte um ShippingJson em colunas canónicas da Order. */
function canonFromShipping(s?: ShippingJson) {
  const a = s?.address ?? null;
  const up = (c?: string | null) => (c ? c.toUpperCase() : c ?? null);
  return {
    shippingFullName: nz(s?.name),
    shippingEmail: nz(s?.email),
    shippingPhone: nz(s?.phone),
    shippingAddress1: nz(a?.line1),
    shippingAddress2: nz(a?.line2),
    shippingCity: nz(a?.city),
    shippingRegion: nz(a?.state),
    shippingPostalCode: nz(a?.postal_code),
    shippingCountry: up(nz(a?.country)),
  };
}

/** Extrai morada de shipping/customer da Stripe Session (se existir). */
function shippingFromStripe(session: any): ShippingJson {
  // Stripe pode expor shipping tanto em `shipping_details` como em `shipping`
  const ship = session?.shipping_details || session?.shipping || null;
  const cust = session?.customer_details || null;

  const addressSrc = ship?.address || cust?.address || null;

  const address =
    addressSrc &&
    (addressSrc.line1 ||
      addressSrc.line2 ||
      addressSrc.city ||
      addressSrc.state ||
      addressSrc.postal_code ||
      addressSrc.country)
      ? {
          line1: nz(addressSrc.line1),
          line2: nz(addressSrc.line2),
          city: nz(addressSrc.city),
          state: nz(addressSrc.state),
          postal_code: nz(addressSrc.postal_code),
          country: nz(addressSrc.country),
        }
      : null;

  const out: ShippingJson = {
    name: nz(ship?.name) || nz(cust?.name),
    phone: nz(ship?.phone) || nz(cust?.phone),
    email: nz(cust?.email),
    address,
  };

  return out;
}

const upper = (s?: string | null) => (s ? s.toUpperCase() : s ?? null);

/* ------------------------------ route ----------------------------- */

export async function POST(req: NextRequest) {
  try {
    // aceitar por querystring ou body
    const url = new URL(req.url);
    const qOrder = url.searchParams.get("order") || undefined;
    const qSession = url.searchParams.get("session_id") || undefined;
    const body = await req.json().catch(() => ({} as any));
    const orderId = (body.orderId as string) || qOrder;
    const sessionId = (body.sessionId as string) || qSession;

    if (!orderId || !sessionId) {
      return NextResponse.json({ error: "Missing order or session_id" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        stripeSessionId: true,
        shippingJson: true,
        shippingCountry: true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Já final? ok idempotente
    if (isFinal(existing.status)) {
      return NextResponse.json({ ok: true, status: "already_paid" });
    }

    // Segurança: a sessão deve bater certo se já estiver gravada
    if (existing.stripeSessionId && existing.stripeSessionId !== sessionId) {
      return NextResponse.json({ error: "Session does not match this order" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      // `shipping_details` costuma vir sem expand; `customer_details` também.
      // Expandimos o payment_intent para obter id e eventualmente detalhes adicionais.
      expand: ["payment_intent", "customer"],
    });

    // Alguns métodos podem demorar a marcar "paid"; devolve 202 para retry
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, status: session.payment_status }, { status: 202 });
    }

    const amountCents =
      typeof session.amount_total === "number" ? session.amount_total : null;
    const currency = upper(session.currency || null);
    const pi = session.payment_intent as any;

    // Merge de morada/e-mail vindos da Stripe (se houver)
    const newShipping = shippingFromStripe(session);
    const mergedShipping = mergeShipping(existing.shippingJson as ShippingJson, newShipping);
    const canon = canonFromShipping(mergedShipping);
    const country =
      canon.shippingCountry || upper(existing.shippingCountry || null) || null;

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
        shippingJson: (mergedShipping as any) ?? undefined,
        ...(country ? { shippingCountry: country } : {}),
        // ✅ grava também as colunas canónicas (para painel/admin e exports)
        ...canon,
      },
    });

    // pós-pagamento (limpar carrinho, métricas, emails, etc.)
    try {
      const { finalizePaidOrder } = await import("@/lib/checkout");
      await finalizePaidOrder(orderId);
    } catch {
      // silencioso — opcional
    }

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Stripe confirm error" },
      { status: 400 }
    );
  }
}
