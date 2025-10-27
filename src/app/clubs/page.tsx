// src/app/clubs/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- helpers -> assets/clubs/<league>/<club>.png ---------------- */
function slugify(s?: string | null) {
  const base = (s ?? "").trim();
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type LeagueKey =
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "eredivisie"
  | "primeira-liga"
  | "scottish-premiership"
  | "brasileirao";

const leagueClubs: Record<LeagueKey, string[]> = {
  "premier-league": [
    "arsenal","aston-villa","bournemouth","brentford","brighton",
    "chelsea","crystal-palace","everton","fulham","leeds-united",
    "burnley","liverpool","manchester-city","manchester-united","newcastle-united",
    "nottingham-forest","sunderland","tottenham-hotspur","west-ham-united","wolverhampton-wanderers",
  ],
  "la-liga": [
    "real-madrid","barcelona","atletico-madrid","athletic-club","real-sociedad",
    "villarreal","real-betis","sevilla","valencia","girona",
    "getafe","celta-vigo","osasuna","rayo-vallecano","alaves",
    "mallorca","las-palmas","leganes","real-valladolid","espanyol",
  ],
  "serie-a": [
    "inter","ac-milan","juventus","napoli","roma",
    "lazio","atalanta","fiorentina","bologna","torino",
    "genoa","monza","udinese","empoli","lecce",
    "cagliari","hellas-verona","como","venezia","parma",
  ],
  "bundesliga": [
    "bayern-munich","borussia-dortmund","rb-leipzig","bayer-leverkusen","vfb-stuttgart",
    "eintracht-frankfurt","sc-freiburg","union-berlin","wolfsburg","mainz-05",
    "augsburg","borussia-monchengladbach","bochum","heidenheim","werder-bremen",
    "hoffenheim","holstein-kiel","st-pauli",
  ],
  "ligue-1": [
    "psg","marseille","lyon","monaco","lille",
    "nice","rennes","nantes","montpellier","strasbourg",
    "reims","toulouse","lens","brest","angers",
    "saint-etienne","auxerre","metz",
  ],
  "eredivisie": [
    "ajax","psv","feyenoord","az-alkmaar","fc-twente",
    "utrecht","heerenveen","nec-nijmegen","sparta-rotterdam","go-ahead-eagles",
    "pec-zwolle","heracles","fortuna-sittard","rkc-waalwijk","vitesse",
    "almere-city","excelsior","fc-volendam",
  ],
  "primeira-liga": [
    "benfica","porto","sporting","braga","vitoria-sc",
    "boavista","rio-ave","famalicao","gil-vicente","estoril",
    "portimonense","casa-pia","farense","moreirense","arouca",
    "estoril-praia","santa-clara","estoril-2",
  ],
  "scottish-premiership": [
    "celtic","rangers","aberdeen","hearts","hibernian",
    "motherwell","st-johnstone","st-mirren","kilmarnock","dundee",
    "ross-county","dundee-united",
  ],
  "brasileirao": [
    "flamengo","palmeiras","corinthians","sao-paulo","santos",
    "fluminense","botafogo","vasco-da-gama","cruzeiro","atletico-mineiro",
    "gremio","internacional","bahia","fortaleza","athletico-pr",
    "cuiaba","goias","red-bull-bragantino","america-mg","coritiba",
  ],
};

function findClubAsset(teamName: string): string | null {
  const slug = slugify(teamName);
  for (const [league, clubs] of Object.entries(leagueClubs) as [LeagueKey, string[]][]) {
    if (clubs.includes(slug)) return `/assets/clubs/${league}/${slug}.png`;
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------- */

type ClubCard = { name: string; image?: string | null; slug: string };

export default async function ClubsPage() {
  const rows = await prisma.product.findMany({
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

    map.set(team, { image: assetImg ?? firstDbImg, slug: slugify(team) });
  }

  const clubs: ClubCard[] = Array.from(map.entries())
    .map(([name, { image, slug }]) => ({ name, image: image ?? undefined, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="container-fw py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>
      </div>

      {/* Grade de cartões — imagem cheia, hover com zoom, CTA no rodapé */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {clubs.map((club) => (
          <Link
            key={club.slug}
            href={`/products/team/${club.slug}`}
            className="group block"
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1">
              {/* imagem */}
              {club.image ? (
                <img
                  src={club.image}
                  alt={club.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="eager"
                />
              ) : (
                /* fallback bonito sem depender de ficheiro externo */
                <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
              )}

              {/* brilho suave nas bordas no hover */}
              <div className="pointer-events-none absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-blue-500/40 transition" />

              {/* gradiente para legibilidade + CTA */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition">
                <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                  View jerseys
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="px-1 pt-2 text-center">
              <h3 className="font-semibold text-sm">{club.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
