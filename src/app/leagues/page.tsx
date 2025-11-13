// src/app/leagues/page.tsx
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG, TEAM_TO_LEAGUE } from "@/lib/leaguesConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getActiveLeagues() {
  // teams que existem na config e têm pelo menos 1 produto
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
    <main className="container-fw py-10">
      <h1 className="text-3xl font-bold mb-6">Leagues</h1>

      {leaguesToShow.length === 0 && (
        <p className="text-gray-600">
          No leagues available yet. Add products to clubs to see them here.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {leaguesToShow.map((league) => (
          <Link
            key={league.slug}
            href={`/leagues/${league.slug}`}
            className="group block rounded-3xl bg-white shadow-md hover:shadow-xl transition overflow-hidden border border-gray-100"
          >
            <div className="relative w-full pt-[135%]">
              <Image
                src={league.image}
                alt={league.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              />
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-sm font-medium group-hover:text-blue-700">
                {league.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
