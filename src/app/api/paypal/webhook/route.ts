// src/app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paypalClient, paypal } from '@/lib/paypal';
import { prisma } from '@/lib/prisma';
import { finalizePaidOrder } from '@/lib/checkout';

export async function POST(req: NextRequest) {
  // Verificação simplificada via API Verify Webhook Signature
  try {
    const body = await req.text();
    const transmissionId = req.headers.get('paypal-transmission-id')!;
    const timestamp = req.headers.get('paypal-transmission-time')!;
    const signature = req.headers.get('paypal-transmission-sig')!;
    const certUrl = req.headers.get('paypal-cert-url')!;
    const authAlgo = req.headers.get('paypal-auth-algo')!;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

    const verifyReq = new paypal.notifications.VerifyWebhookSignatureRequest();
    verifyReq.requestBody({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: signature,
      transmission_time: timestamp,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    });

    const verifyRes = await paypalClient.execute(verifyReq);
    if ((verifyRes.result as any).verification_status !== 'SUCCESS') {
      return new NextResponse('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);
    if (event.event_type === 'PAYMENTS.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const paypalOrderId = capture?.supplementary_data?.related_ids?.order_id;
      const order = await prisma.order.findFirst({ where: { paypalOrderId } });
      if (order && order.status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', paypalCaptureId: capture.id },
        });
        await finalizePaidOrder(order.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Webhook error', { status: 400 });
  }
}
