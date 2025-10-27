// src/app/products/team/[team]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ team: string }> };

// Mapa slug -> nome exatamente como está na BD
const TEAM_MAP: Record<string, string> = {
  "real-madrid": "Real Madrid",
  barcelona: "FC Barcelona",
  "atletico-madrid": "Atlético de Madrid",
  "real-betis": "Real Betis",
  sevilla: "Sevilla FC",
  "real-sociedad": "Real Sociedad",
  villarreal: "Villarreal",

  benfica: "SL Benfica",
  porto: "FC Porto",
  sporting: "Sporting CP",
  braga: "SC Braga",
  "vitoria-sc": "Vitória SC",
};

// fallback simples caso falte no mapa
function fallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const revalidate = 60;

/* ============================ Helpers ============================ */
function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "EUR",
  });
}

function coverUrl(raw?: string | null) {
  const placeholder = "/img/placeholder.png"; // garante ter este ficheiro em /public/img
  if (!raw) return placeholder;
  const url = raw.trim();
  if (!url) return placeholder;
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

/* ============================ Page ============================ */
export default async function TeamProductsPage({ params }: PageProps) {
  const { team } = await params; // params é Promise
  const slug = team.toLowerCase();
  const teamName = TEAM_MAP[slug] ?? fallbackTitle(slug);

  // 1ª tentativa
  let products = await prisma.product.findMany({
    where: { team: teamName },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrls: true, // único campo de imagens
      basePrice: true,
      team: true,
    },
  });

  // Se vazio e existir mapeamento explícito, tenta com o nome do mapa
  if (products.length === 0 && TEAM_MAP[slug]) {
    products = await prisma.product.findMany({
      where: { team: TEAM_MAP[slug]! },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        imageUrls: true,
        basePrice: true,
        team: true,
      },
    });
  }

  if (products.length === 0) notFound();

  return <List team={products[0].team!} items={products} />;
}

/* ============================ UI ============================ */
function List({
  team,
  items,
}: {
  team: string;
  items: {
    slug: string;
    name: string;
    imageUrls?: string[] | null;
    basePrice: number;
  }[];
}) {
  return (
    <div className="container-fw py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{team} — Products</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => {
          const src = coverUrl(p.imageUrls?.[0] ?? null);
          return (
            <a
              key={p.slug}
              href={`/products/${p.slug}`}
              className="rounded-2xl border bg-white overflow-hidden hover:shadow-md transition ring-1 ring-black/5"
            >
              <div className="aspect-[3/4] w-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-6"
                />
              </div>
              <div className="p-4 border-t">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-600">{money(p.basePrice)}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
