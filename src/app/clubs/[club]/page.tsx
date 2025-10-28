// src/app/clubs/[club]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

/** Sempre runtime (sem cache/ISR) */
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

/** Extrai a primeira imagem válida de vários formatos */
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

/** Normaliza caminho local e aceita URLs externas */
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
        <defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#f8fafc' offset='0'/><stop stop-color='#e0f2fe' offset='1'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='system-ui,Segoe UI,Roboto,Ubuntu,Helvetica,Arial' font-size='22' fill='#94a3b8'>No image</text>
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

  // Mapear slug -> nome real do clube
  const teams = await prisma.product.findMany({
    select: { team: true },
    distinct: ["team"],
  });
  const matchedTeam = teams.find((t) => slugify(t.team) === club)?.team ?? null;
  const teamName = matchedTeam ?? titleFromSlug(club);

  // Produtos do clube
  const products = await prisma.product.findMany({
    where: { team: teamName },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrls: true,
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
    <div className="relative min-h-screen overflow-hidden">
      {/* background “hero” com blobs suaves */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute top-32 -right-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-100/40 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white/60 to-sky-50" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-700 text-transparent bg-clip-text">
            {teamName} — Products
          </h1>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300/80 bg-white/70 backdrop-blur-sm text-slate-700 hover:bg-slate-50 hover:border-sky-300 transition font-medium text-sm"
          >
            <span>←</span> Back to all products
          </Link>
        </div>

        {/* Grid de produtos */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((p) => {
            const src = coverUrl(firstImageFrom(p.imageUrls));

            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                aria-label={p.name}
                className="group block rounded-3xl bg-gradient-to-br from-sky-200/50 via-indigo-200/40 to-transparent p-[1px] hover:from-sky-300/70 hover:via-indigo-300/60 transition"
              >
                <div className="rounded-3xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm hover:shadow-2xl hover:ring-sky-200 transition duration-300 overflow-hidden">
                  {/* imagem */}
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-slate-50 to-slate-100">
                    <Image
                      src={src}
                      alt={p.name}
                      fill
                      unoptimized
                      sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
                      className="object-contain p-6 sm:p-7 md:p-6 lg:p-6 transition-transform duration-300 group-hover:scale-110"
                    />

                    {/* brilho muito suave no hover (sem badges) */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-b from-transparent via-white/10 to-sky-100/20" />
                  </div>

                  {/* info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold/relaxed">
                          {p.team ?? teamName}
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-900 leading-tight line-clamp-2">
                          {p.name}
                        </div>
                      </div>

                      {/* price chip (não é badge de produto, é o preço) */}
                      <div className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold bg-slate-900 text-white/95 ring-1 ring-black/5 shadow-sm group-hover:bg-slate-800 transition">
                        {money(p.basePrice)}
                      </div>
                    </div>

                    {/* linha separadora minimal */}
                    <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    {/* CTA minimalista */}
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
