// src/app/clubs/[club]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

/** Sempre runtime (sem cache) */
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================ utils ============================ */
function slugify(s?: string | null) {
  const base = (s ?? "").trim();
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/** Extrai a primeira imagem válida */
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
  if (typeof (value as any)?.url === "string") return (value as any).url.trim();
  if (typeof (value as any)?.src === "string") return (value as any).src.trim();
  return null;
}

/** Normaliza caminho local */
function normalizeLocalPath(p?: string | null): string | null {
  if (!p) return null;
  let s = p.trim();
  if (!s) return null;
  s = s.replace(/^public[\\/]/i, "").replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

/** Fallback elegante */
function coverUrl(raw?: string | null): string {
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#f1f5f9' offset='0'/><stop stop-color='#e0f2fe' offset='1'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='sans-serif' font-size='22' fill='#94a3b8'>No image</text>
      </svg>`
    );

  const n = normalizeLocalPath(raw);
  return n || fallback;
}

/* =============================== PAGE =============================== */
export default async function ClubProductsPage({
  params,
}: {
  params: Promise<{ club: string }>;
}) {
  const { club } = await params;

  // Mapeia nome real do clube
  const teams = await prisma.product.findMany({
    select: { team: true },
    distinct: ["team"],
  });
  const matchedTeam = teams.find((t) => slugify(t.team) === club)?.team ?? null;
  const teamName = matchedTeam ?? titleFromSlug(club);

  // Busca produtos
  const products = await prisma.product.findMany({
    where: { team: teamName },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, imageUrls: true, basePrice: true, team: true },
  });

  if (!products.length) notFound();

  const money = (cents: number) =>
    (Math.round(cents) / 100).toLocaleString("en-GB", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 px-6 sm:px-10 py-12">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-indigo-600 text-transparent bg-clip-text">
            {teamName} — Products
          </h1>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-medium text-sm"
          >
            ← Back to all products
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((p) => {
            const src = coverUrl(firstImageFrom(p.imageUrls));
            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group relative bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-gray-200 hover:shadow-2xl hover:-translate-y-1 transform transition duration-300"
              >
                {/* Imagem */}
                <div className="relative aspect-[4/5] bg-gradient-to-b from-gray-50 to-gray-100">
                  <Image
                    src={src}
                    alt={p.name}
                    fill
                    unoptimized
                    sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
                    className="object-contain p-6 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Info */}
                <div className="p-5 border-t border-gray-100">
                  <div className="text-xs uppercase tracking-wide text-sky-600 font-semibold mb-1">
                    {p.team ?? teamName}
                  </div>
                  <div className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                    {p.name}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-gray-800">
                    {money(p.basePrice)}
                  </div>
                </div>

                {/* Glow no hover */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-b from-transparent via-white/5 to-sky-100/30 pointer-events-none" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
