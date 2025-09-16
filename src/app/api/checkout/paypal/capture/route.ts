// src/app/api/checkout/paypal/capture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaptureBody = { paypalOrderId?: string; orderId?: string };

// Tipagem mínima para ler o resultado do SDK do PayPal
type PayPalCaptureResult = {
  result?: {
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id?: string }> };
    }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, orderId } = (await req.json().catch(() => ({}))) as CaptureBody;

    if (!paypalOrderId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: paypalOrderId and orderId." },
        { status: 400 }
      );
    }

    // Se o PayPal não estiver configurado neste ambiente, não quebrar o build
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal is not configured on this environment." },
        { status: 501 }
      );
    }

    // Importes dinâmicos para evitar problemas de build
    const { paypalClient, paypal } = await import("@/lib/paypal");

    const capReq = new (paypal as any).orders.OrdersCaptureRequest(paypalOrderId);
    capReq.requestBody({});

    const rawRes: unknown = await (paypalClient as any).execute(capReq);
    const res = rawRes as PayPalCaptureResult;

    const status = res?.result?.status ?? "UNKNOWN";
    const captureId = res?.result?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    if (status === "COMPLETED") {
      // ✅ Só atualizamos campos que existem garantidamente
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "paid" }, // se tiveres um campo paidAt, podes também setar paidAt: new Date()
      });

      // Finalização pós-pagamento (estoque, emails, etc.)
      const { finalizePaidOrder } = await import("@/lib/checkout");
      await finalizePaidOrder(orderId);

      return NextResponse.json({
        ok: true,
        status: "COMPLETED",
        captureId: captureId ?? null,
      });
    }

    // Qualquer outro estado: falhou
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "failed" },
    });

    return NextResponse.json({ ok: false, status }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PayPal capture error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
