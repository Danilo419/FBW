// src/app/[locale]/leagues/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG } from "@/lib/leaguesConfig";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  clubImg,
  slugFromTeamName,
  leagueClubs,
  type LeagueKey,
} from "@/lib/shop-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// tenta mapear o slug da league (url) para um LeagueKey do shop-data
function toLeagueKeyFromSlug(slug: string): LeagueKey | null {
  const s = (slug || "").trim().toLowerCase();

  // tenta match direto
  if ((leagueClubs as any)[s]) return s as LeagueKey;

  // aliases comuns
  const ALIASES: Record<string, LeagueKey> = {
    "primeira-liga": "primeira-liga" as LeagueKey,
    "liga-portugal": "primeira-liga" as LeagueKey,
    "liga-nos": "primeira-liga" as LeagueKey,
    "portuguese-primeira-liga": "primeira-liga" as LeagueKey,
  };

  return ALIASES[s] ?? null;
}

// usa SEMPRE o slugFromTeamName + clubImg quando possível
function resolveClubImage(leagueSlug: string, clubName: string, clubSlug?: string) {
  const leagueKey = toLeagueKeyFromSlug(leagueSlug);
  const normalizedSlug = slugFromTeamName(clubName || clubSlug || "");

  if (leagueKey) {
    return clubImg(leagueKey, normalizedSlug);
  }

  return `/assets/clubs/${leagueSlug}/${normalizedSlug}.png`;
}

// usamos any para evitar conflitos com o tipo gerado pelo Next 15
export default async function LeagueDetailPage({ params }: any) {
  const locale: string | undefined = params?.locale;
  const slug: string | undefined = params?.slug;

  if (!locale || !slug) return notFound();

  const t = await getTranslations({
    locale,
    namespace: "LeagueDetailPage",
  });

  const league = LEAGUES_CONFIG.find((l) => l.slug === slug) ?? null;
  if (!league) return notFound();

  const teamNames = league.clubs.map((c) => c.name);

  const teamsWithProducts = await prisma.product.findMany({
    where: { team: { in: teamNames } },
    select: { team: true },
    distinct: ["team"],
  });

  const activeTeamNames = new Set(
    teamsWithProducts.map((t) => t.team).filter(Boolean)
  );

  const clubsToShow = league.clubs.filter((c) => activeTeamNames.has(c.name));

  if (clubsToShow.length === 0) return notFound();

  return (
    <main className="min-h-screen bg-white py-6 md:py-10">
      <div className="container-fw mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-4">
          <Link
            href={`/${locale}/leagues`}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 transition hover:text-slate-900 md:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToLeagues")}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-2 md:mb-8">
          <div className="flex items-start gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 sm:h-14 sm:w-14 md:h-16 md:w-16">
              <Image
                src={league.image}
                alt={league.name}
                fill
                className="object-contain p-3"
                sizes="64px"
                priority
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                {league.country}
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                {league.name}
              </h1>

              <p className="mt-1 max-w-xl text-xs text-slate-600 sm:text-sm">
                {t.rich("subtitle", {
                  brand: () => (
                    <span className="font-semibold text-emerald-600">
                      FootballWorld
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center justify-end gap-2 text-[11px] text-slate-500 sm:text-xs">
            <span className="uppercase tracking-[0.18em]">
              {t("activeClubs")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
              {clubsToShow.length}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {clubsToShow.map((club) => {
            const clubImageSrc = resolveClubImage(league.slug, club.name, club.slug);

            return (
              <Link
                key={club.slug}
                href={`/${locale}/products/team/${club.slug}`}
                className="group block touch-manipulation"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-1">
                  <Image
                    src={clubImageSrc}
                    alt={club.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                  />

                  {/* fallback visual se a imagem falhar/for lenta */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-0 ring-0 transition group-hover:ring-2 group-hover:ring-emerald-500/40" />

                  <div className="absolute bottom-3 left-3 right-3 opacity-0 transition group-hover:opacity-100">
                    <div className="flex items-center justify-between text-[11px] text-white sm:text-xs md:text-sm">
                      {t("viewJerseys")}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-3 text-center">
                  <h3 className="text-xs font-semibold text-slate-900 sm:text-sm md:text-base">
                    {club.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}