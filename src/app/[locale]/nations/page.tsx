import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { slugFromTeamName } from "@/lib/shop-data";

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

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

function getFirstImage(imageUrls: unknown): string | null {
  try {
    if (!imageUrls) return null;

    if (Array.isArray(imageUrls)) {
      const first = imageUrls.find(
        (s) => typeof s === "string" && s.trim().length > 0
      );
      return first ? normalizeUrl(String(first).trim()) : null;
    }

    if (typeof imageUrls === "string") {
      const s = imageUrls.trim();
      if (!s) return null;

      if (s.startsWith("[") && s.endsWith("]")) {
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const first = parsed.find(
            (x) => typeof x === "string" && x.trim().length > 0
          );
          return first ? normalizeUrl(String(first).trim()) : null;
        }
      }

      return normalizeUrl(s);
    }

    return null;
  } catch {
    return null;
  }
}

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
    const firstDbImg = getFirstImage(r.imageUrls);
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-2 md:mb-8">
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
              {t("totalNationsLabel")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-800">
              {t("totalNationsValue", { count: nations.length })}
            </span>
          </div>
        </div>

        {nations.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {nations.map((nation) => (
              <Link
                key={nation.slug}
                href={`/nations/${nation.slug}`}
                className="group block touch-manipulation"
                aria-label={t("nationLinkAria", { nation: nation.name })}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-1">
                  {nation.image ? (
                    <Image
                      src={nation.image}
                      alt={t("nationImageAlt", { nation: nation.name })}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      unoptimized={isExternalUrl(nation.image)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 px-3 text-center text-xs font-semibold text-slate-500 sm:text-sm">
                      {t("noImage")}
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 ring-0 transition group-hover:ring-2 group-hover:ring-emerald-500/40" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="absolute bottom-3 left-3 right-3 opacity-0 transition group-hover:opacity-100">
                    <div className="flex items-center justify-between text-[11px] text-white sm:text-xs md:text-sm">
                      <span>{t("viewJerseys")}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="px-1 pt-3 text-center">
                  <h3 className="text-xs font-semibold text-slate-900 sm:text-sm md:text-base">
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