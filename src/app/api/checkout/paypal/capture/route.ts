// src/app/api/checkout/paypal/capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paypalClient, paypal } from '@/lib/paypal';
import { prisma } from '@/lib/prisma';
import { finalizePaidOrder } from '@/lib/checkout';

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, orderId } = await req.json() as { paypalOrderId: string; orderId: string };

    const capReq = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    capReq.requestBody({});

    const res = await paypalClient.execute(capReq);
    const status = (res.result as any).status as string;
    const captureId = (res.result as any)?.purchase_units?.[0]?.payments?.captures?.[0]?.id as string | undefined;

    if (status === 'COMPLETED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid', paypalCaptureId: captureId ?? null },
      });
      await finalizePaidOrder(orderId);
      return NextResponse.json({ ok: true });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'failed' },
    });
    return NextResponse.json({ ok: false, status }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'PayPal capture error' }, { status: 400 });
  }
}
