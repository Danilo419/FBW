// src/app/clubs/[club]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

/** Render sempre em runtime (sem SSG/ISR) */
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

/** Extrai a primeira imagem de vários formatos possíveis */
function firstImageFrom(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const s = value.trim();
    return s || null;
  }

  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof (v as any).url === "string" && (v as any).url.trim())
        return (v as any).url.trim();
      if (v && typeof (v as any).src === "string" && (v as any).src.trim())
        return (v as any).src.trim();
    }
    return null;
  }

  try {
    const any: any = value;
    if (typeof any?.url === "string" && any.url.trim()) return any.url.trim();
    if (typeof any?.src === "string" && any.src.trim()) return any.src.trim();
  } catch {}

  return null;
}

/** Normaliza caminho local e aceita URLs externas */
function normalizeLocalPath(p?: string | null): string | null {
  if (!p) return null;
  let s = p.trim();
  if (!s) return null;

  // remove prefixo "public/" se existir
  s = s.replace(/^public[\\/]/i, "");

  // barras windows -> unix
  s = s.replace(/\\/g, "/");

  // se for http/https, deixa como está
  if (/^https?:\/\//i.test(s)) return s;

  // força "/" inicial para servir a partir de /public
  if (!s.startsWith("/")) s = "/" + s;

  return s;
}

/** Produz um URL final com fallback visível */
function coverUrl(raw?: string | null): string {
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='666' viewBox='0 0 500 666'>
        <defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#eef2ff' offset='0'/><stop stop-color='#e0f2fe' offset='1'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <g fill='#94a3b8' font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='22'>
          <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>No image</text>
        </g>
      </svg>`
    );

  const n = normalizeLocalPath(raw);
  return n || fallback;
}

/* ===================== static params (dev only) ===================== */
/**
 * Em ambiente de build na Vercel, não pré-gera nada para não bater no DB.
 * Em dev local, podes continuar a pré-gerar se quiseres.
 */
export async function generateStaticParams() {
  if (process.env.VERCEL) return [];

  const rows = await prisma.product.findMany({
    select: { team: true },
    distinct: ["team"],
  });

  return rows
    .map((r) => r.team)
    .filter((t): t is string => !!t && t.trim().length > 0)
    .map((team) => ({ club: slugify(team) }));
}

/* =============================== page =============================== */
export default async function ClubProductsPage({
  params,
}: {
  params: Promise<{ club: string }>;
}) {
  // ✅ o teu router fornece params como Promise
  const { club } = await params;

  // Lista de equipas distintas para mapear slug -> nome real
  const teams = await prisma.product.findMany({
    select: { team: true },
    distinct: ["team"],
  });

  const matchedTeam = teams.find((t) => slugify(t.team) === club)?.team ?? null;
  const teamName = matchedTeam ?? titleFromSlug(club);

  const products = await prisma.product.findMany({
    where: { team: teamName },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrls: true, // ✅ único campo de imagens existente
      basePrice: true,
      team: true,
    },
  });

  if (!products.length) notFound();

  const money = (cents: number) =>
    (Math.round(cents) / 100).toLocaleString("en-GB", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <div className="container-fw py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {teamName} — Products
        </h1>
        <Link
          href="/products"
          className="rounded-full px-4 py-2 border hover:bg-gray-50 text-sm"
        >
          ← Back to all products
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((p) => {
          const first = firstImageFrom(p.imageUrls);
          const src = coverUrl(first);

          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group rounded-2xl border bg-white overflow-hidden ring-1 ring-black/5 hover:shadow-md transition"
            >
              <div className="relative aspect-[4/5] bg-white">
                <Image
                  src={src}
                  alt={p.name}
                  fill
                  unoptimized
                  sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
                  className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  priority={false}
                />
              </div>
              <div className="p-3 border-t">
                <div className="text-xs text-gray-500">{p.team ?? teamName}</div>
                <div className="font-semibold line-clamp-2">{p.name}</div>
                <div className="mt-1 text-sm text-gray-700">
                  {money(p.basePrice)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
