import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // ajusta o path se necessário
import { prisma } from '@/lib/prisma';

function orderTotalCents(o: { totalCents: number | null; subtotal: number; shipping: number; tax: number }) {
  return (o.totalCents ?? (o.subtotal + o.shipping + o.tax)) | 0;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      status: true,
      currency: true,
      subtotal: true,
      shipping: true,
      tax: true,
      totalCents: true,
      items: { select: { id: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      currency: o.currency,
      totalCents: orderTotalCents(o),
      itemsCount: o.items.length,
    })),
  });
}
