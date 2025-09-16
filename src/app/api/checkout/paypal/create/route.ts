// src/app/api/checkout/paypal/create/route.ts
import { NextResponse } from 'next/server';
import { paypalClient, paypal } from '@/lib/paypal';
import { prisma } from '@/lib/prisma';
import { createOrderFromCart } from '@/lib/checkout';

export async function POST() {
  try {
    const order = await createOrderFromCart();

    const req = new paypal.orders.OrdersCreateRequest();
    req.prefer('return=representation');
    req.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.id,
        amount: {
          currency_code: order.currency,
          value: (order.total / 100).toFixed(2), // PayPal usa decimais
        },
      }],
      application_context: {
        brand_name: 'FootBallWorld',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?order=${order.id}&provider=paypal`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      },
    });

    const res = await paypalClient.execute(req);
    const paypalOrderId = (res.result as any).id as string;

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId },
    });

    return NextResponse.json({ id: paypalOrderId, orderId: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'PayPal error' }, { status: 400 });
  }
}
