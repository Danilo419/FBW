// src/app/products/team/[team]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ team: string }> };

// mapeia slugs -> nomes exatamente como estão na BD (seed)
const TEAM_MAP: Record<string, string> = {
  "real-madrid": "Real Madrid",
  "barcelona": "FC Barcelona",
  "atletico-madrid": "Atlético de Madrid",
  "real-betis": "Real Betis",
  "sevilla": "Sevilla FC",
  "real-sociedad": "Real Sociedad",
  "villarreal": "Villarreal",

  "benfica": "SL Benfica",
  "porto": "FC Porto",
  "sporting": "Sporting CP",
  "braga": "SC Braga",
  "vitoria-sc": "Vitória SC",
};

// fallback simples (capitaliza palavras) caso falte no mapa
function fallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const revalidate = 60;

export default async function TeamProductsPage({ params }: PageProps) {
  const { team } = await params; // 👈 agora é awaited
  const slug = team.toLowerCase();
  const teamName = TEAM_MAP[slug] ?? fallbackTitle(slug);

  const products = await prisma.product.findMany({
    where: { team: teamName },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      images: true,
      basePrice: true,
      team: true,
    },
  });

  if (products.length === 0) {
    // se não encontrou nada com o nome do mapa, tenta também pelo fallback
    if (teamName !== TEAM_MAP[slug]) {
      const retry = await prisma.product.findMany({
        where: { team: TEAM_MAP[slug] ?? teamName },
        select: {
          id: true,
          slug: true,
          name: true,
          images: true,
          basePrice: true,
          team: true,
        },
      });
      if (retry.length) return <List team={retry[0].team!} items={retry} />;
    }
    notFound();
  }

  return <List team={products[0].team!} items={products} />;
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "EUR",
  });
}

function List({
  team,
  items,
}: {
  team: string;
  items: { slug: string; name: string; images: string[]; basePrice: number }[];
}) {
  return (
    <div className="container-fw py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{team} — Products</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => (
          <a
            key={p.slug}
            href={`/products/${p.slug}`}
            className="rounded-2xl border bg-white overflow-hidden hover:shadow-md transition"
          >
            <div className="aspect-[3/4] w-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.images?.[0] ?? "/placeholder.png"}
                alt={p.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="p-4 border-t">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-600">{money(p.basePrice)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
