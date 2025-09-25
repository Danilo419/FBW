// src/lib/kpis.ts
import { prisma } from "@/lib/prisma";

/** Orders shipped = encomendas pagas */
export async function getOrdersShippedCount(): Promise<number> {
  return prisma.order.count({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } as any },
      ],
    },
  });
}

/** Countries served = países distintos (shippingCountry) em encomendas pagas */
export async function getCountriesServedCount(): Promise<number> {
  const rows = await prisma.order.findMany({
    where: {
      OR: [
        { paidAt: { not: null } },
        { status: { in: ["paid", "shipped", "delivered"] } as any },
      ],
      shippingCountry: { not: null },
    },
    select: { shippingCountry: true },
  });

  const uniq = new Set(
    rows
      .map((r: { shippingCountry: string | null }) =>
        (r.shippingCountry ?? "").trim().toLowerCase()
      )
      .filter(Boolean)
  );

  return uniq.size;
}
