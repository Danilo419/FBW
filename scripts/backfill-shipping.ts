// scripts/backfill-shipping.ts
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type Ship = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

function fromJSON(json: Prisma.JsonValue | null | undefined): Ship {
  const j = (json ?? {}) as Record<string, any>;
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = j?.[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return undefined;
  };
  return {
    fullName: get("fullName", "name", "recipient"),
    email: get("email"),
    phone: get("phone", "telephone"),
    address1: get("address1", "addressLine1", "line1", "street"),
    address2: get("address2", "addressLine2", "line2", "street2"),
    city: get("city", "locality", "town"),
    region: get("region", "state", "province"),
    postalCode: get("postalCode", "zip", "zipCode", "postcode"),
    country: get("country", "countryCode", "shippingCountry"),
  };
}

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { shippingFullName: null },
        { shippingEmail: null },
        { shippingPhone: null },
        { shippingAddress1: null },
        { shippingCity: null },
        { shippingPostalCode: null },
        { shippingCountry: null },
      ],
    },
    select: { id: true, shippingJson: true },
  });

  for (const o of orders) {
    const s = fromJSON(o.shippingJson);
    await prisma.order.update({
      where: { id: o.id },
      data: {
        shippingFullName: s.fullName ?? undefined,
        shippingEmail: s.email ?? undefined,
        shippingPhone: s.phone ?? undefined,
        shippingAddress1: s.address1 ?? undefined,
        shippingAddress2: s.address2 ?? undefined,
        shippingCity: s.city ?? undefined,
        shippingRegion: s.region ?? undefined,
        shippingPostalCode: s.postalCode ?? undefined,
        shippingCountry: s.country ?? undefined,
      },
    });
  }

  console.log(`Backfill concluído: ${orders.length} encomendas processadas.`);
}

main().finally(() => prisma.$disconnect());
