// src/app/leagues/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
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
    const leagueSlug = TEAM_TO_LEAGUE.get(row.team);
    if (leagueSlug) activeLeagueSlugs.add(leagueSlug);
  }

  return LEAGUES_CONFIG.filter((lg) => activeLeagueSlugs.has(lg.slug)).sort(
    (a, b) => a.name.localeCompare(b.name)
  );
}

export default async function LeaguesPage() {
  const leaguesToShow = await getActiveLeagues();

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated background (agora super suave porque fundo é branco) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-300/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-300/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[140px]" />
      </div>

      <div className="container-fw py-24 relative z-10">
        {/* HEADER */}
        <div className="text-center mb-20 space-y-6">
          <div className="relative inline-block">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 text-transparent bg-clip-text animate-gradient-x">
              Leagues
            </h1>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-300/20 via-sky-300/20 to-emerald-300/20 blur-3xl -z-10" />
          </div>

          <p className="text-gray-600 text-xl font-light tracking-wide max-w-2xl mx-auto">
            Explore the world&apos;s most prestigious football leagues
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
          </div>
        </div>

        {/* GRID */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-[1800px] mx-auto px-4">
          {leaguesToShow.map((league, index) => (
            <Link
              key={league.slug}
              href={`/leagues/${league.slug}`}
              className="group relative block animate-fadeInUp"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Glow */}
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-300/30 via-sky-300/20 to-emerald-300/30 opacity-0 group-hover:opacity-100 blur-[50px] transition-all duration-700 -z-10" />

              {/* CARD */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-br from-white to-gray-50 backdrop-blur-xl border border-gray-200 overflow-hidden transform-gpu transition-all duration-700 group-hover:scale-[1.02] group-hover:border-sky-300">
                {/* Shine */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />

                {/* IMAGE */}
                <div className="relative w-full pt-[130%] overflow-hidden rounded-t-[2.5rem]">
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transform-gpu transition-all duration-[1200ms] ease-out group-hover:scale-[1.12]"
                  />

                  {/* Removi todas as sombras escuras */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/30" />
                </div>

                {/* CONTENT */}
                <div className="relative px-7 py-7 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:to-blue-500 group-hover:bg-clip-text transition-all duration-500">
                      {league.name}
                    </h3>

                    {/* pequena barra */}
                    <div className="h-[2px] w-10 bg-gradient-to-r from-sky-400/70 to-transparent rounded-full" />
                  </div>

                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300/60 to-transparent" />

                  {/* CTA PRINCIPAL: VIEW CLUBS */}
                  <div className="flex items-center justify-center gap-3 text-sm font-bold text-sky-500 group-hover:text-sky-600 transition-colors duration-300">
                    <span className="inline-block h-[2px] w-8 bg-gradient-to-r from-transparent to-sky-400 rounded-full group-hover:w-12 transition-all duration-300" />
                    <span className="tracking-[0.2em]">VIEW CLUBS</span>
                    <span className="inline-block h-[2px] w-8 bg-gradient-to-l from-transparent to-sky-400 rounded-full group-hover:w-12 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* EMPTY */}
        {leaguesToShow.length === 0 && (
          <div className="text-center py-20 space-y-4 text-gray-500 text-lg">
            <div className="text-6xl">⚽</div>
            No leagues available at the moment
          </div>
        )}
      </div>
    </main>
  );
}
