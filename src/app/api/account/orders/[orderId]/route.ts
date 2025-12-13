// src/app/api/account/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ----------------------- helpers ----------------------- */

function orderTotalCents(o: {
  totalCents: number | null;
  subtotal: number;
  shipping: number;
  tax: number;
}) {
  return (o.totalCents ?? o.subtotal + o.shipping + o.tax) | 0;
}

/* ------------------------- GET ------------------------- */
/**
 * ⚠️ Next.js 15 type-check BUG:
 * The second argument MUST NOT be strongly typed.
 * Using `context: any` avoids build failures on Vercel.
 */
export async function GET(_req: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = String(context?.params?.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId, // 🔒 segurança: só o dono vê
      },
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
          // OrderItem NÃO tem createdAt → usar id
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
            imageUrls: Array.isArray(it.product.imageUrls)
              ? it.product.imageUrls
              : [],
            badges: Array.isArray(it.product.badges)
              ? it.product.badges
              : [],
          },
        })),
      },
    });
  } catch (err: any) {
    console.error("Order details API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
