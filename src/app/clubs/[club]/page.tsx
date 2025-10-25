// src/app/clubs/[club]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

/** Render sempre em runtime (sem SSG/ISR) */
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      imageUrls: true, // ✅ substitui "images"
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
          const img =
            (Array.isArray(p.imageUrls) && p.imageUrls.length > 0
              ? p.imageUrls[0]
              : undefined) ?? "/placeholder.png";

          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group rounded-2xl border bg-white overflow-hidden"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={img}
                  alt={p.name}
                  fill
                  sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  priority={false}
                />
              </div>
              <div className="p-3">
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
