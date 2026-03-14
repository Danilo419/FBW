import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? null;
    const cartId = jar.get("cartId")?.value ?? null;

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

    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.qty ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const totalPrice = Number(item.totalPrice ?? 0);

      if (totalPrice > 0) return sum + totalPrice;
      return sum + unitPrice * qty;
    }, 0);

    const count = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);

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
