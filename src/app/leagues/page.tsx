// src/app/leagues/page.tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import { LEAGUES_CONFIG, TEAM_TO_LEAGUE } from "@/lib/leaguesConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getActiveLeagues() {
  const teams = await prisma.product.findMany({
    where: { team: { in: Array.from(TEAM_TO_LEAGUE.keys()) } },
    select: { team: true },
    distinct: ["team"],
  });

  const activeLeagueSlugs = new Set<string>();
  for (const row of teams) {
    const leagueSlug = row.team ? TEAM_TO_LEAGUE.get(row.team) : undefined;
    if (leagueSlug) activeLeagueSlugs.add(leagueSlug);
  }

  return LEAGUES_CONFIG.filter((lg) => activeLeagueSlugs.has(lg.slug)).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

type LeagueCard = {
  slug: string;
  name: string;
  image: string;
};

export default async function LeaguesPage() {
  const leaguesToShow = (await getActiveLeagues()) as LeagueCard[];

  return (
    <main className="min-h-screen bg-white py-6 md:py-10">
      <div className="container-fw mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Header — IGUAL AO VISUAL DA PÁGINA CLUBS */}
        <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              Leagues
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
              Explore the world&apos;s most prestigious football leagues with{" "}
              <span className="font-semibold text-emerald-600">
                FootballWorld
              </span>{" "}
              products available.
            </p>
          </div>

          <div className="inline-flex items-center justify-end text-[11px] sm:text-xs text-slate-500 gap-1">
            <span className="uppercase tracking-[0.18em]">Total leagues</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800 font-medium">
              {leaguesToShow.length}
            </span>
          </div>
        </div>

        {/* Grid — IGUAL AO VISUAL DA PÁGINA CLUBS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {leaguesToShow.map((league) => (
            <Link
              key={league.slug}
              href={`/leagues/${league.slug}`}
              className="group block touch-manipulation"
            >
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1">
                {league.image ? (
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    priority={false}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                )}

                <div className="pointer-events-none absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-emerald-500/40 transition" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex items-center justify-between text-white text-[11px] sm:text-xs md:text-sm">
                    View clubs
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="px-1 pt-3 text-center">
                <h3 className="font-semibold text-xs sm:text-sm md:text-base text-slate-900">
                  {league.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
