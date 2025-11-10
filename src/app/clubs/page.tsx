// src/app/clubs/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import {
  leagueClubs,
  slugFromTeamName,
  clubImg,
  type LeagueKey,
} from "@/lib/shop-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- usar SEMPRE as helpers da lib ---------------- */
function findClubAsset(teamName: string): string | null {
  const slug = slugFromTeamName(teamName); // ✅ normaliza com aliases (Atlético -> atletico-madrid)
  for (const [league, clubs] of Object.entries(leagueClubs) as [LeagueKey, string[]][]) {
    if (clubs.includes(slug)) {
      return clubImg(league, slug); // ✅ gera o path correto
    }
  }
  return null;
}

type ClubCard = { name: string; image?: string | null; slug: string };

export default async function ClubsPage() {
  const rows = await prisma.product.findMany({
    select: { team: true, imageUrls: true },
    orderBy: { team: "asc" },
  });

  const map = new Map<string, { image: string | null; slug: string }>();

  for (const r of rows) {
    const team = (r.team || "").trim();
    if (!team || map.has(team)) continue;

    const assetImg = findClubAsset(team);
    const arr = Array.isArray(r.imageUrls) ? r.imageUrls : [];
    const firstDbImg = arr.find((s) => typeof s === "string" && s.trim().length > 0) ?? null;

    // ✅ usa o slug normalizado central (compatível com /products/team/[slug])
    const slug = slugFromTeamName(team);
    map.set(team, { image: assetImg ?? firstDbImg, slug });
  }

  const clubs: ClubCard[] = Array.from(map.entries())
    .map(([name, { image, slug }]) => ({ name, image: image ?? undefined, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="container-fw py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>
      </div>

      {/* Grade de cartões — imagem cheia, hover com zoom, CTA no rodapé */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {clubs.map((club) => (
          <Link
            key={club.slug}
            href={`/products/team/${club.slug}`}
            className="group block"
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1">
              {club.image ? (
                <img
                  src={club.image}
                  alt={club.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="eager"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
              )}

              <div className="pointer-events-none absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-blue-500/40 transition" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition">
                <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                  View jerseys
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="px-1 pt-2 text-center">
              <h3 className="font-semibold text-sm">{club.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
