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
    <main className="min-h-screen bg-white relative">
      {/* Fundo suave */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px]" />
      </div>

      {/* CONTAINER AJUSTADO AO HEADER FIXO */}
      <div className="container-fw pt-16 pb-14 relative z-10">
        {/* HEADER DO TÍTULO */}
        <div className="text-center mb-8 space-y-3">
          <h1
            className="
              inline-block
              text-5xl md:text-6xl 
              font-black 
              tracking-tight 
              leading-[1.15]
              py-1
              bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 
              text-transparent bg-clip-text
            "
          >
            Leagues
          </h1>

          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Explore the world&apos;s most prestigious football leagues
          </p>
        </div>

        {/* GRID */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-[1800px] mx-auto px-4">
          {leaguesToShow.map((league) => (
            <Link key={league.slug} href={`/leagues/${league.slug}`} className="group block">
              <div
                className="
                  rounded-[2rem] bg-white border border-gray-200 
                  overflow-hidden shadow-sm 
                  transition-transform duration-300
                  hover:scale-[1.01] hover:shadow-md
                "
              >
                {/* IMAGE */}
                <div className="relative w-full pt-[130%] overflow-hidden rounded-t-[2rem]">
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                </div>

                {/* CONTENT */}
                <div className="px-7 py-7 space-y-4 text-center">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {league.name}
                  </h3>

                  <div className="h-[2px] w-10 bg-gradient-to-r from-sky-400 to-transparent mx-auto rounded-full" />

                  <div className="pt-2 text-sm font-bold text-sky-600 tracking-[0.2em]">
                    VIEW CLUBS
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
