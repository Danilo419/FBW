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
    <main className="min-h-screen bg-white py-8 md:py-10">
      <div className="container-fw mx-auto px-4 md:px-6 lg:px-8">
        {/* Top bar / breadcrumb */}
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leagues
          </Link>
        </div>

        {/* Hero / header */}
        <section className="mb-8 md:mb-10 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white px-4 py-5 md:px-6 md:py-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 md:h-20 md:w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
                <Image
                  src={league.image}
                  alt={league.name}
                  fill
                  className="object-contain p-3"
                  sizes="80px"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {league.country}
                </p>
                <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  {league.name}
                </h1>
                <p className="mt-1 max-w-xl text-xs md:text-sm text-slate-600">
                  Select a club below to explore all{" "}
                  <span className="font-semibold text-emerald-600">FootballWorld</span>{" "}
                  products available for that team.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs md:text-sm text-slate-800">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Active clubs
                </span>
                <span className="mt-1 text-lg md:text-xl font-semibold">
                  {clubsToShow.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Clubs grid */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm md:text-base font-semibold tracking-[0.16em] uppercase text-slate-700">
              Clubs in {league.name}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clubsToShow.map((club) => {
              const clubImageSrc = `/assets/clubs/${league.slug}/${club.slug}.png`;

              return (
                <Link
                  key={club.slug}
                  href={`/products/team/${club.slug}`}
                  className="group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-transform transition-shadow duration-200 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className="relative w-full pt-[135%] bg-slate-50">
                    <Image
                      src={clubImageSrc}
                      alt={club.name}
                      fill
                      className="object-contain p-4 md:p-5 transition-transform duration-200 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 18vw"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/5 via-transparent to-transparent" />
                  </div>

                  <div className="relative px-4 pb-4 pt-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Club
                    </p>
                    <div className="mt-1 text-sm md:text-base font-semibold text-slate-900 group-hover:text-emerald-600">
                      {club.name}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      View all products →
                    </p>
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
