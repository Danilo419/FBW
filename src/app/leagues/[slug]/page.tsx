// src/app/leagues/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG } from "@/lib/leaguesConfig";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <main className="min-h-screen bg-white">
      <div className="container-fw mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leagues
          </Link>

          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            FootballWorld · Leagues
          </span>
        </div>

        {/* Hero / header */}
        <section className="mb-10 md:mb-12 rounded-[28px] border border-slate-200 bg-white px-4 py-5 md:px-7 md:py-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-inner">
                <Image
                  src={league.image}
                  alt={league.name}
                  fill
                  className="object-contain p-3"
                  sizes="80px"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    {league.country}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl md:text-3xl lg:text-[2.1rem] font-black tracking-tight text-slate-900">
                  {league.name}
                </h1>

                <p className="mt-1.5 max-w-xl text-xs md:text-sm text-slate-600">
                  Explore official-style jerseys, training wear and premium concept kits
                  for every club in this league, curated by{" "}
                  <span className="font-semibold text-emerald-600">FootballWorld</span>.
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-3 md:gap-4">
              <div className="flex min-w-[130px] flex-col rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm text-slate-800">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Active clubs
                </span>
                <span className="mt-1 text-xl md:text-2xl font-semibold">
                  {clubsToShow.length}
                </span>
              </div>

              <div className="hidden sm:flex min-w-[150px] flex-col rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm text-slate-800">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Product focus
                </span>
                <span className="mt-1 text-sm md:text-base font-semibold text-slate-900">
                  Jerseys & training
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </section>

        {/* Clubs grid */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase text-slate-700">
                Clubs in {league.name}
              </h2>
              <p className="mt-1 text-[11px] md:text-xs text-slate-500">
                Select a club to view all available products for that team.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clubsToShow.map((club) => {
              const clubImageSrc = `/assets/clubs/${league.slug}/${club.slug}.png`;

              return (
                <Link
                  key={club.slug}
                  href={`/products/team/${club.slug}`}
                  className="group relative block overflow-hidden rounded-[26px] border border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.07)] transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative w-full pt-[135%] bg-slate-50">
                    <Image
                      src={clubImageSrc}
                      alt={club.name}
                      fill
                      className="object-contain p-4 md:p-5 transition-transform duration-200 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 18vw"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent" />
                  </div>

                  <div className="relative px-4 pb-4 pt-3 text-center">
                    <div className="text-sm md:text-base font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {club.name}
                    </div>

                    <p
                      className="
                        mt-1 text-[11px] text-slate-500 
                        opacity-0 translate-y-1 
                        transition-all duration-200 
                        group-hover:opacity-100 group-hover:translate-y-0
                      "
                    >
                      View all products →
                    </p>

                    <div className="mt-3 h-px w-full scale-x-75 mx-auto bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
