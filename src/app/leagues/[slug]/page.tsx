// src/app/leagues/[slug]/page.tsx
import Link from "next/link";

/**
 * Page: /leagues/[slug]
 * - Não depende de Prisma (evita "prisma.club" inexistente).
 * - Mostra clubes a partir de um mapa estático de slugs.
 * - Linka cada clube para /products/team/[club].
 * - Usa imagens em /assets/clubs/[league]/[club].png (igual ao resto do site).
 */

type Props = { params: { slug: string } };

const TITLES: Record<string, string> = {
  "premier-league": "Premier League",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  eredivisie: "Eredivisie",
  "primeira-liga": "Primeira Liga (PT)",
  "scottish-premiership": "Scottish Premiership",
  brasileirao: "Brasileirão",
};

// Mapa estático (mesmos slugs usados no catálogo)
const CLUBS_BY_LEAGUE: Record<string, string[]> = {
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
  brasileirao: [
    "flamengo","palmeiras","corinthians","sao-paulo","santos",
    "fluminense","botafogo","vasco-da-gama","cruzeiro","atletico-mineiro",
    "gremio","internacional","bahia","fortaleza","athletico-pr",
    "cuiaba","goias","red-bull-bragantino","america-mg","coritiba",
  ],
};

function titleFromSlug(slug: string) {
  return (
    TITLES[slug] ??
    slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ")
  );
}

function humanizeSlug(s: string) {
  // Pequenas exceções comuns
  if (s.toLowerCase() === "psg") return "Paris Saint-Germain";
  return s
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function clubImg(league: string, club: string) {
  return `/assets/clubs/${league}/${club}.png`;
}

export default async function LeaguePage({ params }: Props) {
  const slug = (params.slug || "").toLowerCase();
  const title = titleFromSlug(slug);

  const clubs: string[] = CLUBS_BY_LEAGUE[slug] ?? [];

  return (
    <div className="container-fw py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="text-sm text-gray-600">
          Browse clubs and products for the {title}.
        </p>
      </header>

      {clubs.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {clubs.map((clubSlug: string) => (
            <Link
              key={clubSlug}
              href={`/products/team/${encodeURIComponent(clubSlug)}`}
              className="group rounded-2xl border bg-white p-4 hover:shadow"
            >
              <div className="aspect-square rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                {/* usa next/image se preferires */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clubImg(slug, clubSlug)}
                  alt={humanizeSlug(clubSlug)}
                  className="max-h-24"
                />
              </div>
              <div className="mt-2 font-semibold truncate">
                {humanizeSlug(clubSlug)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-700">
            We couldn’t list clubs for this league right now.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You can still browse via the clubs page filtered by this league.
          </p>
          <Link
            href={`/clubs?league=${encodeURIComponent(slug)}`}
            className="inline-flex mt-4 rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
          >
            Open clubs for {title}
          </Link>
        </div>
      )}
    </div>
  );
}
