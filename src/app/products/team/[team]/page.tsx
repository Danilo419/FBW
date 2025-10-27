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

  // Se já for string
  if (typeof value === "string") return value;

  // Se for array (ex.: scalar list ou JSON)
  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  }

  // Se for objeto JSON (pouco provável, mas seguro)
  try {
    // casos raros: {0:"/img/a.png"} ou {url:"/img/a.png"}
    const maybe: any = value as any;
    if (typeof maybe?.url === "string" && maybe.url.trim()) return maybe.url.trim();
    if (typeof maybe?.src === "string" && maybe.src.trim()) return maybe.src.trim();
    // tenta indices
    if (typeof maybe?.[0] === "string" && maybe[0].trim()) return maybe[0].trim();
  } catch {}
  return null;
}

/** Normaliza para URL absoluta/relativa válida e devolve um placeholder se nada existir */
function coverUrl(raw?: string | null): string {
  // usa um placeholder universal (SVG inline) caso não exista ficheiro local
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
      imageUrls: true, // pode vir como string[] (scalar list) ou JSON
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
    imageUrls?: unknown; // ← aceite qualquer formato para extração robusta
    basePrice: number;
  }[];
}) {
  return (
    <div className="container-fw py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{team} — Products</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => {
          const first = firstImageFrom(p.imageUrls);
          const src = coverUrl(first);
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
