// src/app/pt-stock/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductChannel } from "@prisma/client";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function getImages(imageUrls: unknown): string[] {
  try {
    if (!imageUrls) return ["/placeholder.png"];

    if (Array.isArray(imageUrls)) {
      const arr = imageUrls
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .map(normalizeUrl);

      return arr.length ? arr : ["/placeholder.png"];
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return ["/placeholder.png"];

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const arr = parsed
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .map(normalizeUrl);

          return arr.length ? arr : ["/placeholder.png"];
        }
      }

      return [normalizeUrl(s)];
    }

    return ["/placeholder.png"];
  } catch {
    return ["/placeholder.png"];
  }
}

function formatMoneyRight(cents: number) {
  const s = formatMoney(cents);

  let m = s.match(/^-€\s*(.+)$/);
  if (m) return `-${m[1]}€`;

  m = s.match(/^€\s*(.+)$/);
  if (m) return `${m[1]}€`;

  return s;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PtStockProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
      isVisible: true,
      channel: ProductChannel.PT_STOCK_CTT,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      basePrice: true,
      imageUrls: true,
      team: true,
      season: true,
      sizes: {
        where: { available: true },
        select: { size: true },
        orderBy: { size: "asc" },
      },
    },
  });

  if (!product) notFound();

  const images = getImages(product.imageUrls);
  const mainImage = images[0];
  const availableSizes = product.sizes.map((s) => s.size);

  return (
    <main className="min-h-screen bg-white">
      <div className="container-fw py-8 md:py-10">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            Início
          </Link>
          <span className="mx-2">/</span>
          <Link href="/pt-stock" className="hover:text-gray-900">
            Stock em Portugal
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          {/* GALERIA */}
          <section>
            <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
              <div className="relative aspect-[4/5] w-full bg-white">
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  unoptimized={isExternalUrl(mainImage)}
                  priority
                />
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((img, i) => (
                  <div
                    key={`${img}-${i}`}
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl border bg-white"
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      className="object-contain"
                      unoptimized={isExternalUrl(img)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* INFO */}
          <section className="space-y-6">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Stock em Portugal • Entrega rápida
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                {product.name}
              </h1>

              {(product.team || product.season) && (
                <p className="mt-2 text-sm text-gray-600">
                  {product.team}
                  {product.team && product.season ? " • " : ""}
                  {product.season}
                </p>
              )}

              <div className="mt-4 text-3xl font-black text-slate-900">
                {formatMoneyRight(product.basePrice)}
              </div>
            </div>

            {/* ENTREGA CTT */}
            <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-300 bg-white shadow-sm">
                  <span className="text-lg font-black text-yellow-500">CTT</span>
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    Entrega com os CTT
                  </h2>
                  <p className="mt-1 text-sm text-slate-700">
                    Este produto já se encontra em stock em Portugal e é enviado
                    pelos <strong>CTT</strong>.
                  </p>
                  <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                    Entrega estimada: 2–3 dias úteis
                  </div>
                </div>
              </div>
            </div>

            {/* ENVIO */}
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Informação de envio
              </h2>

              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-start justify-between gap-4 border-b pb-3">
                  <span>1 camisola</span>
                  <span className="font-semibold text-slate-900">6€ de envio</span>
                </div>

                <div className="flex items-start justify-between gap-4 border-b pb-3">
                  <span>2 camisolas</span>
                  <span className="font-semibold text-slate-900">3€ de envio</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span>3 ou mais camisolas</span>
                  <span className="font-semibold text-emerald-700">
                    Envio gratuito
                  </span>
                </div>
              </div>
            </div>

            {/* TAMANHOS */}
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Tamanhos disponíveis</h2>

              {availableSizes.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <div
                      key={size}
                      className="rounded-xl border bg-gray-50 px-4 py-2 text-sm font-medium text-slate-900"
                    >
                      {size}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  Sem tamanhos disponíveis de momento.
                </p>
              )}
            </div>

            {/* DESCRIÇÃO */}
            {product.description && (
              <div className="rounded-3xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Descrição</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                  {product.description}
                </p>
              </div>
            )}

            {/* NOTA */}
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
              <strong>Vantagem do stock em Portugal:</strong> entrega mais rápida,
              sem espera de envio internacional, mantendo a mesma qualidade do
              produto.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}