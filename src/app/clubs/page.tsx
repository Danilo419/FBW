// src/app/clubs/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ClubsClient from "./ClubsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- helpers para casar nomes -> assets/clubs/<league>/<club>.png ---------------- */

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
    if (clubs.includes(slug)) {
      return `/assets/clubs/${league}/${slug}.png`;
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------- */

type ClubCard = { name: string; image?: string | null };

export default async function ClubsPage() {
  const rows = await prisma.product.findMany({
    select: { team: true, imageUrls: true },
    orderBy: { team: "asc" },
  });

  const map = new Map<string, string | null>();

  for (const r of rows) {
    const team = (r.team || "").trim();
    if (!team) continue;

    // 1) tenta usar o asset estático (mesmo estilo da homepage)
    const assetImg = findClubAsset(team);

    // 2) fallback: primeira imagem do product (DB), se ainda não tiver escolhido nada
    const arr = Array.isArray(r.imageUrls) ? r.imageUrls : [];
    const firstDbImg =
      arr.find((s) => typeof s === "string" && s.trim().length > 0) ?? null;

    // prioriza asset; se não houver, usa DB
    const chosen = assetImg ?? firstDbImg;

    // guarda só a primeira vez que encontrar esse clube
    if (!map.has(team)) map.set(team, chosen);
  }

  const clubs: ClubCard[] = Array.from(map.entries())
    .map(([name, image]) => ({ name, image }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="container-fw py-10 space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading clubs…
          </div>
        }
      >
        <ClubsClient initialClubs={clubs} />
      </Suspense>
    </main>
  );
}
