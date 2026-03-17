// src/app/api/cart/subtotal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  // Se vier em cêntimos (ex: 3499), converte para euros (34.99)
  if (value >= 1000) return value / 100;

  return value;
}

export async function GET(req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;
    const cartId = jar.get("cartId")?.value ?? null;

    const excludeChannel = req.nextUrl.searchParams.get("excludeChannel");

    let where:
      | { cart: { sessionId: string } }
      | { cartId: string }
      | null = null;

    if (sid) {
      where = { cart: { sessionId: sid } };
    } else if (cartId) {
      where = { cartId };
    } else {
      return NextResponse.json(
        { subtotal: 0, count: 0 },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const items = await prisma.cartItem.findMany({
      where,
      select: {
        qty: true,
        unitPrice: true,
        totalPrice: true,
        product: {
          select: {
            channel: true, // 🔥 IMPORTANTE
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!items.length) {
      return NextResponse.json(
        { subtotal: 0, count: 0 },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // 🔥 FILTRAR ITENS (remover PT_STOCK se pedido)
    const filteredItems = excludeChannel
      ? items.filter((item) => item.product?.channel !== excludeChannel)
      : items;

    const subtotal = filteredItems.reduce((sum, item) => {
      const qty = Number(item.qty ?? 0);
      const unitPrice = normalizeMoney(Number(item.unitPrice ?? 0));
      const totalPrice = normalizeMoney(Number(item.totalPrice ?? 0));

      if (totalPrice > 0) return sum + totalPrice;
      return sum + unitPrice * qty;
    }, 0);

    const count = filteredItems.reduce(
      (sum, item) => sum + Number(item.qty ?? 0),
      0
    );

    return NextResponse.json(
      { subtotal, count },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[api/cart/subtotal] failed:", error);

    return NextResponse.json(
      { subtotal: 0, count: 0, error: "SUBTOTAL_FAILED" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}