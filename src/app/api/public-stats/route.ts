// src/app/api/public-stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // sem cache em app router
export const revalidate = 0;

export async function GET() {
  // Community: nº total de utilizadores
  const community = await prisma.user.count();

  // Orders shipped: conta pagos/shipped/delivered (ajusta se quiseres)
  const ordersShipped = await prisma.order.count({
    where: { status: { in: ["paid", "shipped", "delivered"] } },
  });

  // Countries served: países distintos em encomendas com pagamento feito
  const distinctCountries = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "shipped", "delivered"] },
      shippingCountry: { not: null },
    },
    select: { shippingCountry: true },
    distinct: ["shippingCountry"],
  });
  const countries = distinctCountries.length;

  // Average rating (0.0 a 5.0)
  const agg = await prisma.review.aggregate({ _avg: { rating: true } });
  const average = Number(agg._avg.rating ?? 0);
  const averageRounded = Math.round(average * 10) / 10; // 1 casa decimal

  return NextResponse.json(
    {
      countries,
      averageRating: averageRounded,
      ordersShipped,
      community,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
