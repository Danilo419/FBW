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
    <main className="container-fw py-20">
      <div className="text-center mb-14">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 text-transparent bg-clip-text drop-shadow">
          Leagues
        </h1>
        <p className="mt-3 text-gray-600 text-lg">
          Choose a league to explore clubs.
        </p>
      </div>

      <div className="relative [perspective:2000px]">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {leaguesToShow.map((league) => (
            <Link
              key={league.slug}
              href={`/leagues/${league.slug}`}
              className="group relative block transform-gpu transition-all duration-500 hover:-translate-y-4 hover:rotate-[1.2deg] hover:scale-[1.03]"
            >
              {/* Exterior glow */}
              <div className="pointer-events-none absolute -inset-4 rounded-[2.2rem] bg-gradient-to-br from-blue-500/40 via-sky-400/20 to-emerald-400/40 opacity-0 blur-2xl group-hover:opacity-100 group-hover:blur-[42px] transition duration-500 -z-10" />

              {/* Card */}
              <div className="rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0px_20px_60px_-15px_rgba(0,0,0,0.65)] overflow-hidden transform-gpu transition-all duration-500 group-hover:shadow-[0px_32px_70px_-10px_rgba(0,0,0,0.75)]">
                
                {/* Image container */}
                <div className="relative w-full pt-[135%] overflow-hidden">
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transform-gpu transition-transform duration-[900ms] ease-out group-hover:scale-110 group-hover:-translate-y-2"
                  />
                  
                  {/* cinematic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/40 to-black/70" />

                  {/* highlight diagonal */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-700" />
                </div>

                {/* Text */}
                <div className="px-6 py-6 text-center">
                  <div className="text-lg font-semibold text-white tracking-tight drop-shadow">
                    {league.name}
                  </div>
                  <div className="text-[12px] text-sky-400/90 tracking-[0.25em] uppercase mt-1">
                    View Clubs
                  </div>

                  {/* enter line */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-[12px] font-medium text-sky-400/90">
                    <span className="inline-block h-[1px] w-6 bg-sky-500/70 translate-y-[1px] group-hover:translate-x-1 transition-transform duration-300" />
                    ENTER
                    <span className="inline-block h-[1px] w-6 bg-sky-500/70 -translate-y-[1px] group-hover:-translate-x-1 transition-transform duration-300" />
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
