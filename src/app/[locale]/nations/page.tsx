import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";
import { slugFromTeamName } from "@/lib/shop-data";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NationCard = {
  name: string;
  image?: string | null;
  slug: string;
};

const NATION_ASSET_BY_SLUG: Record<string, string> = {
  argentina: "Argentinafc.png",
  belgium: "Belgiumfc.png",
  brazil: "Brazilfc.png",
  croatia: "Croatiafc.png",
  england: "Englandfc.png",
  france: "Francefc.png",
  germany: "Germanyfc.png",
  italy: "Italyfc.png",
  japan: "Japanfc.png",
  mexico: "Mexicofc.png",
  netherlands: "Netherlandsfc.png",
  portugal: "Portugalfc.png",
  spain: "Spainfc.png",
  switzerland: "Switzerlandfc.png",
  "united-states": "UnitedStatesfc.png",
  uruguay: "Uruguayfc.png",
  usa: "UnitedStatesfc.png",
};

function findNationAsset(teamName: string): string | null {
  const slug = slugFromTeamName(teamName);
  const file = NATION_ASSET_BY_SLUG[slug];
  return file ? `/assets/nations/${file}` : null;
}

export default async function NationsPage() {
  const t = await getTranslations("nationsPage");

  const rows = await prisma.product.findMany({
    where: { teamType: "NATION" },
    select: { team: true, imageUrls: true },
    orderBy: { team: "asc" },
  });

  const map = new Map<string, { image: string | null; slug: string }>();

  for (const r of rows) {
    const team = (r.team || "").trim();
    if (!team || map.has(team)) continue;

    const assetImg = findNationAsset(team);
    const arr = Array.isArray(r.imageUrls) ? r.imageUrls : [];
    const firstDbImg =
      arr.find((s) => typeof s === "string" && s.trim().length > 0) ?? null;

    const slug = slugFromTeamName(team);
    map.set(team, { image: assetImg ?? firstDbImg, slug });
  }

  const nations: NationCard[] = Array.from(map.entries())
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
        <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              {t("title")}
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
              {t.rich("subtitle", {
                brand: (chunks) => (
                  <span className="font-semibold text-emerald-600">
                    {chunks}
                  </span>
                ),
              })}
            </p>
          </div>

          <div className="inline-flex items-center justify-end text-[11px] sm:text-xs text-slate-500 gap-1">
            <span className="uppercase tracking-[0.18em]">
              {t("totalNations")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800 font-medium">
              {nations.length}
            </span>
          </div>
        </div>

        {/* Grid */}
        {nations.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {nations.map((nation) => (
              <Link
                key={nation.slug}
                href={`/nations/${nation.slug}`}
                className="group block touch-manipulation"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1">
                  {nation.image ? (
                    <img
                      src={nation.image}
                      alt={t("nationImageAlt", { nation: nation.name })}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                  )}

                  <div className="pointer-events-none absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-emerald-500/40 transition" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition">
                    <div className="flex items-center justify-between text-white text-[11px] sm:text-xs md:text-sm">
                      {t("viewJerseys")}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-3 text-center">
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base text-slate-900">
                    {nation.name}
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