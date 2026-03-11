import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  const slugs = await prisma.product.findMany({ select: { slug: true } });
  return slugs.map(({ slug }) => ({ slug }));
}
