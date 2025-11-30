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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[140px]" />
      </div>

      <div className="container-fw py-24 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20 space-y-6">
          <div className="inline-block">
            <div className="relative">
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 text-transparent bg-clip-text animate-gradient-x">
                Leagues
              </h1>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 via-sky-400/20 to-emerald-400/20 blur-3xl -z-10" />
            </div>
          </div>
          
          <p className="text-gray-400 text-xl font-light tracking-wide max-w-2xl mx-auto">
            Explore the world's most prestigious football leagues
          </p>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
          </div>
        </div>

        {/* Leagues Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-[1800px] mx-auto px-4">
          {leaguesToShow.map((league, index) => (
            <Link
              key={league.slug}
              href={`/leagues/${league.slug}`}
              className="group relative block"
              style={{ 
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${index * 0.1}s`,
                opacity: 0
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-500/30 via-sky-400/20 to-emerald-400/30 opacity-0 group-hover:opacity-100 blur-[50px] transition-all duration-700 -z-10" />

              {/* Card Container */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.7)] overflow-hidden transform-gpu transition-all duration-700 group-hover:scale-[1.02] group-hover:shadow-[0_30px_90px_-10px_rgba(0,0,0,0.85)] group-hover:border-sky-400/30">
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />

                {/* Image Container */}
                <div className="relative w-full pt-[130%] overflow-hidden rounded-t-[2.5rem]">
                  <Image
                    src={league.image}
                    alt={league.name}
                    fill
                    className="object-cover transform-gpu transition-all duration-[1200ms] ease-out group-hover:scale-[1.15] group-hover:rotate-1"
                  />
                  
                  {/* Multi-layer gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-black/90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  
                  {/* Dynamic light streak */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-sky-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-400/30 to-transparent rounded-bl-[5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Content Section */}
                <div className="relative px-7 py-7 space-y-4">
                  {/* League Name */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-sky-300 group-hover:to-blue-300 group-hover:bg-clip-text transition-all duration-500">
                      {league.name}
                    </h3>
                    
                    {/* Subtitle */}
                    <div className="flex items-center gap-2">
                      <div className="h-[2px] w-8 bg-gradient-to-r from-sky-400/60 to-transparent rounded-full" />
                      <p className="text-xs text-sky-400/90 tracking-[0.3em] uppercase font-semibold">
                        View Clubs
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Enter Button */}
                  <div className="flex items-center justify-center gap-3 text-sm font-bold text-sky-400/80 group-hover:text-sky-300 transition-colors duration-300">
                    <span className="inline-block h-[2px] w-8 bg-gradient-to-r from-transparent to-sky-400/70 rounded-full group-hover:w-12 transition-all duration-300" />
                    <span className="tracking-[0.2em]">EXPLORE</span>
                    <span className="inline-block h-[2px] w-8 bg-gradient-to-l from-transparent to-sky-400/70 rounded-full group-hover:w-12 transition-all duration-300" />
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>

              {/* Floating particles effect */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-sky-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-emerald-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {leaguesToShow.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">⚽</div>
            <p className="text-gray-400 text-lg">No leagues available at the moment</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </main>
  );
}