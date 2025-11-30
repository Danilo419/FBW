// src/app/leagues/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG, TEAM_TO_LEAGUE } from "@/lib/leaguesConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getActiveLeagues() {
  const teams = await prisma.product.findMany({
    where: {
      team: {
        in: Array.from(TEAM_TO_LEAGUE.keys()),
      },
    },
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
    <main className="container-fw py-14">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-blue-400 text-transparent bg-clip-text drop-shadow-sm">
          Leagues
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Explore official leagues — clubs, badges, and authentic collections.
        </p>
      </div>

      {leaguesToShow.length === 0 && (
        <p className="text-gray-600 text-center">
          No leagues available yet. Add products to clubs to see them here.
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {leaguesToShow.map((league) => (
          <Link
            key={league.slug}
            href={`/leagues/${league.slug}`}
            className="group block rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-600 hover:-translate-y-1"
          >
            <div className="relative w-full pt-[130%] overflow-hidden">
              <Image
                src={league.image}
                alt={league.name}
                fill
                className="object-cover transform transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              />

              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/25 opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            </div>

            <div className="px-4 py-4 text-center">
              <div className="text-base font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">
                {league.name}
              </div>

              {/* linha elegante */}
              <div className="h-[2px] w-10 bg-blue-600 mx-auto mt-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
