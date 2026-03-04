// src/app/pt-stock/[slug]/page.tsx

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductConfigurator from "@/components/ProductConfigurator";

export const dynamic = "force-dynamic";

type Params = {
  params: {
    slug: string;
  };
};

export default async function PtStockProductPage({ params }: Params) {
  const { slug } = params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
      channel: "PT_STOCK_CTT" as any,
      isVisible: true,
    },
    include: {
      sizes: true,
      options: {
        include: {
          values: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="container-fw py-10">
      {/* PT Stock Banner */}
      <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Portugal Delivery (CTT)
            </div>
            <div className="text-sm text-gray-600">
              Este produto está em <b>stock em Portugal</b> e será enviado pelos{" "}
              <b>CTT em 2–3 dias úteis</b>.
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-full border bg-gray-50 px-4 py-2">
            <div className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span>
                1 camisola: <b>6€</b>
              </span>
              <span className="hidden sm:block text-gray-300">•</span>
              <span>
                2 camisolas: <b>3€</b>
              </span>
              <span className="hidden sm:block text-gray-300">•</span>
              <span>
                3+ camisolas: <b>FREE</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product */}
      <ProductConfigurator
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          team: product.team,
          season: product.season,
          basePrice: product.basePrice,
          description: product.description,
          imageUrls: product.imageUrls,
          badges: product.badges,
          allowNameNumber: product.allowNameNumber,
          sizes: product.sizes,
          options: product.options,
        }}
      />
    </div>
  );
}