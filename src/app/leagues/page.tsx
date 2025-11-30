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
    <main className="container-fw py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-400 text-transparent bg-clip-text drop-shadow-sm">
          Leagues
        </h1>
        <p className="text-gray-600 mt-3 text-sm md:text-base max-w-xl mx-auto">
          Choose a league to explore clubs, badges and curated football collections.
        </p>
      </div>

      {leaguesToShow.length === 0 && (
        <p className="text-gray-600 text-center">
          No leagues available yet. Add products to clubs to see them here.
        </p>
      )}

      <div className="relative [perspective:1600px]">
        <div className="grid gap-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {leaguesToShow.map((league) => (
            <Link
              key={league.slug}
              href={`/leagues/${league.slug}`}
              className="group relative block transform-gpu transition-transform duration-500 hover:-translate-y-4 hover:rotate-[1.2deg]"
            >
              {/* Glow exterior 3D */}
              <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-blue-500/40 via-sky-400/20 to-emerald-400/40 opacity-0 blur-2xl group-hover:opacity-100 group-hover:blur-3xl transition duration-500 -z-10" />

              {/* Card principal */}
              <div className="rounded-[1.8rem] bg-slate-950 shadow-xl shadow-slate-900/70 border border-slate-800/80 overflow-hidden transform-gpu transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-slate-900/90">
                <div className="relative w-full pt-[130%] overflow-hidden">
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transform-gpu transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-1"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />

                  {/* Overlay parallax / depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/80 mix-blend-multiply" />

                  {/* Brilho diagonal */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
                </div>

                <div className="px-5 py-4 text-center">
                  <div className="text-base font-semibold text-slate-50 tracking-tight">
                    {league.name}
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    View clubs & kits
                  </p>

                  {/* linha + “parallax” leve */}
                  <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-medium text-sky-400/90">
                    <span className="inline-block h-[1px] w-5 bg-sky-500/70 translate-y-[1px] group-hover:translate-x-1 transition-transform duration-300" />
                    <span className="tracking-[0.25em]">
                      ENTER
                    </span>
                    <span className="inline-block h-[1px] w-5 bg-sky-500/70 -translate-y-[1px] group-hover:-translate-x-1 transition-transform duration-300" />
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
