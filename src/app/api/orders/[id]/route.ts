// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            qty: true,
            totalPrice: true,
            image: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // shape mínimo que a SuccessClient espera
    const shaped = {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total ?? null,
      totalCents: (order as any).totalCents ?? null, // caso uses cents numérico
      items: order.items.map((it) => ({
        id: it.id,
        name: it.name,
        qty: it.qty,
        totalPrice: it.totalPrice,
        image: it.image ?? null,
      })),
    };

    return NextResponse.json({ order: shaped });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load order" },
      { status: 500 }
    );
  }
}
