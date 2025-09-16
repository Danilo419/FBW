import { prisma } from "@/lib/prisma";

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      sizes: true,
      options: { include: { values: true } },
    },
  });
}
