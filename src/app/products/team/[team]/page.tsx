// src/app/products/team/[team]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/* ============================ Config ============================ */
export const revalidate = 60;

type PageProps = { params: Promise<{ team: string }> };

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

/* ============================ Promo map ============================ */
const SALE_MAP: Record<number, number> = {
  3499: 10000, // €34,99 → €100,00
  3999: 11000, // €39,99 → €110,00
  4499: 15000, // €44,99 → €150,00
  4999: 16000, // €49,99 → €160,00
};

function getCompareAt(basePriceCents: number) {
  const compareAt = SALE_MAP[basePriceCents];
  if (!compareAt) return null;
  const pct = Math.round((1 - basePriceCents / compareAt) * 100);
  return { compareAt, pct };
}

/* ============================ Utils ============================ */
function fallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "EUR",
  });
}

function priceParts(cents: number) {
  const euros = Math.floor(cents / 100).toString();
  const dec = (cents % 100).toString().padStart(2, "0");
  return { sym: "€", int: euros, dec };
}

function firstImageFrom(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;

  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof (v as any).url === "string" && (v as any).url.trim())
        return (v as any).url.trim();
      if (v && typeof (v as any).src === "string" && (v as any).src.trim())
        return (v as any).src.trim();
    }
  }

  const any: any = value;
  if (typeof any?.url === "string" && any.url.trim()) return any.url.trim();
  if (typeof any?.src === "string" && any.src.trim()) return any.src.trim();
  return null;
}

function coverUrl(raw?: string | null): string {
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='22' fill='#9ca3af'>No image</text>
      </svg>`
    );
  if (!raw) return fallback;
  const p = raw.trim();
  if (p.startsWith("http")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/* ============================ Page ============================ */
export default async function TeamProductsPage({ params }: PageProps) {
  const { team } = await params;
  const slug = team.toLowerCase();
  const teamName = TEAM_MAP[slug] ?? fallbackTitle(slug);

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { team: { equals: teamName, mode: "insensitive" } },
        { team: { contains: teamName, mode: "insensitive" } },
        { team: { contains: slug, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, name: true, imageUrls: true, basePrice: true, team: true },
  });

  if (!products.length) notFound();

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Fundo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-32 -right-20 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white/60 to-sky-50" />
      </div>

      {/* 🔁 Igual ao ResultsClient: sem max-w, mesma grid e gap */}
      <div className="px-6 sm:px-10 py-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black mb-10">
          {team} — Products
        </h1>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const src = coverUrl(firstImageFrom(p.imageUrls));
            const sale = getCompareAt(p.basePrice);
            const parts = priceParts(p.basePrice);

            return (
              <a
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group block rounded-3xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-sky-200 transition duration-300 overflow-hidden"
              >
                {/* Sticker vermelho */}
                {sale && (
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-md ring-1 ring-red-700/40">
                    -{sale.pct}%
                  </div>
                )}

                {/* Card em coluna (igual ao ResultsClient) */}
                <div className="flex flex-col h-full">
                  {/* Imagem */}
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Conteúdo */}
                  <div className="p-5 flex flex-col grow">
                    <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
                      {team}
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-900 leading-tight line-clamp-2">
                      {p.name}
                    </div>

                    {/* Preço */}
                    <div className="mt-4">
                      {sale && (
                        <div className="mb-1 text-[13px] text-slate-500 line-through">
                          {money(sale.compareAt)}
                        </div>
                      )}
                      <div className="flex items-end gap-0.5 text-slate-900">
                        <span className="text-[15px] font-medium translate-y-[1px]">
                          {parts.sym}
                        </span>
                        <span className="text-2xl font-semibold tracking-tight leading-none">
                          {parts.int}
                        </span>
                        <span className="text-[13px] font-medium translate-y-[1px]">
                          ,{parts.dec}
                        </span>
                      </div>
                    </div>

                    {/* Footer preso ao fundo + CTA centrada verticalmente (h-12) */}
                    <div className="mt-auto">
                      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                      <div className="h-12 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span className="transition group-hover:translate-x-0.5">
                          View product
                        </span>
                        <svg
                          className="h-4 w-4 opacity-70 group-hover:opacity-100 transition group-hover:translate-x-0.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
