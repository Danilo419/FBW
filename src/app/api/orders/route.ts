// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

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
            product: {
              select: {
                imageUrls: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const shaped = {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total ?? null,
      totalCents: order.totalCents ?? null,
      items: order.items.map((it) => {
        const productImages = Array.isArray(it.product?.imageUrls)
          ? it.product!.imageUrls
          : [];

        return {
          id: it.id,
          name: it.name,
          qty: it.qty,
          totalPrice: it.totalPrice,
          // 👇 imagem FINAL usada pelo frontend
          image: it.image || productImages[0] || null,
        };
      }),
    };

    return NextResponse.json({ order: shaped });
  } catch (e: any) {
    console.error("Orders API error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load order" },
      { status: 500 }
    );
  }
}
