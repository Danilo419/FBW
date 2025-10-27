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

/** Extrai a primeira imagem válida de qualquer formato possível vindo da BD */
function firstImageFrom(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  }

  try {
    const maybe: any = value as any;
    if (typeof maybe?.url === "string" && maybe.url.trim()) return maybe.url.trim();
    if (typeof maybe?.src === "string" && maybe.src.trim()) return maybe.src.trim();
    if (typeof maybe?.[0] === "string" && maybe[0].trim()) return maybe[0].trim();
  } catch {}
  return null;
}

/** Normaliza para URL absoluta/relativa válida e devolve um placeholder se nada existir */
function coverUrl(raw?: string | null): string {
  const dataFallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <defs>
          <linearGradient id='g' x1='0' x2='1'>
            <stop stop-color='#eef2ff' offset='0'/>
            <stop stop-color='#e0f2fe' offset='1'/>
          </linearGradient>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <g fill='#94a3b8' font-family='system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial' font-size='22'>
          <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>No image</text>
        </g>
      </svg>`
    );

  const p = raw?.trim();
  if (!p) return dataFallback;
  if (p.startsWith("http")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/* ============================ Page ============================ */
export default async function TeamProductsPage({ params }: PageProps) {
  const { team } = await params;
  const slug = team.toLowerCase();
  const teamName = TEAM_MAP[slug] ?? fallbackTitle(slug);

  // Busca insensível e por "contains" (apanha FC Barcelona, etc.)
  let products = await prisma.product.findMany({
    where: {
      OR: [
        { team: { equals: teamName, mode: "insensitive" } },
        { team: { contains: teamName, mode: "insensitive" } },
        { team: { contains: "Barcelona", mode: "insensitive" } },
        { team: { contains: slug, mode: "insensitive" } },
      ],
    },
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

  if (products.length === 0 && TEAM_MAP[slug]) {
    products = await prisma.product.findMany({
      where: {
        OR: [
          { team: { equals: TEAM_MAP[slug]!, mode: "insensitive" } },
          { team: { contains: TEAM_MAP[slug]!, mode: "insensitive" } },
        ],
      },
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
    imageUrls?: unknown;
    basePrice: number;
  }[];
}) {
  return (
    <div className="container-fw py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{team} — Products</h1>

      {/* Grade densa */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {items.map((p) => {
          const first = firstImageFrom(p.imageUrls);
          const src = coverUrl(first);
          return (
            <a
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group block rounded-xl border bg-white overflow-hidden ring-1 ring-black/5 transition hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Imagem cheia */}
              <div className="relative aspect-[4/5] w-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={p.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Caption sem truncar: nome em várias linhas + preço por baixo */}
              <div className="p-3 border-t">
                <div className="font-semibold text-sm leading-snug whitespace-normal break-words">
                  {p.name}
                </div>
                <div className="mt-1 text-sm text-gray-700">{money(p.basePrice)}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
