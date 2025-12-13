// src/app/api/account/orders/[orderId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ajusta o path se necessário
import { prisma } from "@/lib/prisma";

function orderTotalCents(o: {
  totalCents: number | null;
  subtotal: number;
  shipping: number;
  tax: number;
}) {
  return (o.totalCents ?? (o.subtotal + o.shipping + o.tax)) | 0;
}

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, userId }, // 🔒 só o dono vê
    select: {
      id: true,
      createdAt: true,
      status: true,
      currency: true,
      subtotal: true,
      shipping: true,
      tax: true,
      totalCents: true,
      items: {
        // ✅ OrderItem não tem createdAt no teu schema -> usa id (ou remove)
        orderBy: { id: "asc" },
        select: {
          id: true,
          qty: true,
          unitPrice: true,
          totalPrice: true,
          name: true,
          image: true,
          snapshotJson: true,
          product: {
            select: {
              id: true,
              name: true,
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

  return NextResponse.json({
    order: {
      ...order,
      totalCents: orderTotalCents(order),
      items: order.items.map((it) => ({
        ...it,
        product: {
          ...it.product,
          imageUrls: Array.isArray(it.product.imageUrls) ? it.product.imageUrls : [],
          badges: Array.isArray(it.product.badges) ? it.product.badges : [],
        },
      })),
    },
  });
}
