// src/app/clubs/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  leagueClubs,
  slugFromTeamName,
  clubImg,
  type LeagueKey,
} from "@/lib/shop-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- usar SEMPRE as helpers da lib ---------------- */
function findClubAsset(teamName: string): string | null {
  const slug = slugFromTeamName(teamName);

  for (const [league, clubs] of Object.entries(leagueClubs) as [
    LeagueKey,
    string[]
  ][]) {
    if (clubs.includes(slug)) {
      return clubImg(league, slug);
    }
  }

  return null;
}

type ClubCard = {
  name: string;
  image?: string | null;
  slug: string;
};

export default async function ClubsPage() {
  const t = await getTranslations("clubsPage");

  const rows = await prisma.product.findMany({
    where: {
      teamType: "CLUB",
      isVisible: true,
      NOT: {
        channel: "PT_STOCK_CTT",
      },
    },
    select: { team: true, imageUrls: true },
    orderBy: { team: "asc" },
  });

  const map = new Map<string, { image: string | null; slug: string }>();

  for (const r of rows) {
    const team = (r.team || "").trim();
    if (!team || map.has(team)) continue;

    const assetImg = findClubAsset(team);
    const arr = Array.isArray(r.imageUrls) ? r.imageUrls : [];
    const firstDbImg =
      arr.find((s) => typeof s === "string" && s.trim().length > 0) ?? null;

    const slug = slugFromTeamName(team);
    map.set(team, { image: assetImg ?? firstDbImg, slug });
  }

  const clubs: ClubCard[] = Array.from(map.entries())
    .map(([name, { image, slug }]) => ({
      name,
      image: image ?? undefined,
      slug,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-white py-6 md:py-10">
      <div className="container-fw mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {t("title")}
            </h1>

            <p className="mt-1 max-w-xl text-xs text-slate-600 sm:text-sm">
              {t.rich("subtitle", {
                brand: (chunks) => (
                  <span className="font-semibold text-emerald-600">
                    {chunks}
                  </span>
                ),
              })}
            </p>
          </div>

          <div className="inline-flex items-center justify-end gap-1 text-[11px] text-slate-500 sm:text-xs">
            <span className="uppercase tracking-[0.18em]">
              {t("totalClubs")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
              {clubs.length}
            </span>
          </div>
        </div>

        {/* Grid */}
        {clubs.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {clubs.map((club) => (
              <Link
                key={club.slug}
                href={`/products/team/${club.slug}`}
                className="group block touch-manipulation"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-1">
                  {club.image ? (
                    <img
                      src={club.image}
                      alt={t("clubImageAlt", { club: club.name })}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                  )}

                  <div className="pointer-events-none absolute inset-0 ring-0 transition group-hover:ring-2 group-hover:ring-emerald-500/40" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

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
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">{t("empty")}</p>
          </div>
        )}
      </div>
    </main>
  );
}