// src/app/leagues/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG } from "@/lib/leaguesConfig";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// usamos any para evitar conflitos com o tipo gerado pelo Next 15
export default async function LeagueDetailPage({ params }: any) {
  const slug: string | undefined = params?.slug;
  if (!slug) return notFound();

  const league = LEAGUES_CONFIG.find((l) => l.slug === slug) ?? null;
  if (!league) return notFound();

  const teamNames = league.clubs.map((c) => c.name);

  const teamsWithProducts = await prisma.product.findMany({
    where: { team: { in: teamNames } },
    select: { team: true },
    distinct: ["team"],
  });

  const activeTeamNames = new Set(teamsWithProducts.map((t) => t.team));
  const clubsToShow = league.clubs.filter((c) => activeTeamNames.has(c.name));

  if (clubsToShow.length === 0) return notFound();

  return (
    <main className="min-h-screen bg-white py-6 md:py-10">
      <div className="container-fw mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-4">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leagues
          </Link>
        </div>

        {/* Header (mesmo vibe/estrutura do ClubsPage) */}
        <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-sm bg-white">
              <Image
                src={league.image}
                alt={league.name}
                fill
                className="object-contain p-3"
                sizes="64px"
                priority
              />
            </div>

            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {league.country}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                {league.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
                Select a club below to explore all{" "}
                <span className="font-semibold text-emerald-600">
                  FootballWorld
                </span>{" "}
                products available for that team.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center justify-end text-[11px] sm:text-xs text-slate-500 gap-2">
            <span className="uppercase tracking-[0.18em]">Active clubs</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800 font-medium">
              {clubsToShow.length}
            </span>
          </div>
        </div>

        {/* Grid de cartões — igual ao visual do ClubsPage */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {clubsToShow.map((club) => {
            const clubImageSrc = `/assets/clubs/${league.slug}/${club.slug}.png`;

            return (
              <Link
                key={club.slug}
                href={`/products/team/${club.slug}`}
                className="group block touch-manipulation"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1">
                  <Image
                    src={clubImageSrc}
                    alt={club.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                  />

                  <div className="pointer-events-none absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-emerald-500/40 transition" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition">
                    <div className="flex items-center justify-between text-white text-[11px] sm:text-xs md:text-sm">
                      View jerseys
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-3 text-center">
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base text-slate-900">
                    {club.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
