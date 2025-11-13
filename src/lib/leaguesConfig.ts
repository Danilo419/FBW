// src/lib/leaguesConfig.ts

/**
 * CONFIG das leagues + clubes.
 * - "teamName" TEM de ser igual a Product.team
 * - "clubSlug" é usado em /clubs/[clubSlug]
 * - "image" é o logo/cartão da league (os que tens na screenshot)
 */

export type LeagueClub = {
  teamName: string;
  clubSlug: string;
};

export type LeagueConfig = {
  slug: string; // usado em /leagues/[slug]
  name: string;
  image: string; // caminho da imagem da league
  clubs: LeagueClub[];
};

export const LEAGUES_CONFIG: LeagueConfig[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    image: "/leagues/premier-league.png",
    clubs: [
      { teamName: "Arsenal", clubSlug: "arsenal" },
      { teamName: "Aston Villa", clubSlug: "aston-villa" },
      { teamName: "Chelsea", clubSlug: "chelsea" },
      { teamName: "Liverpool", clubSlug: "liverpool" },
      { teamName: "Manchester City", clubSlug: "manchester-city" },
      { teamName: "Manchester United", clubSlug: "manchester-united" },
      { teamName: "Newcastle United", clubSlug: "newcastle-united" },
      { teamName: "Tottenham Hotspur", clubSlug: "tottenham" },
    ],
  },
  {
    slug: "la-liga",
    name: "La Liga",
    image: "/leagues/la-liga.png",
    clubs: [
      { teamName: "Real Madrid", clubSlug: "real-madrid" },
      { teamName: "FC Barcelona", clubSlug: "barcelona" },
      { teamName: "Atlético Madrid", clubSlug: "atletico-madrid" },
      { teamName: "Real Betis", clubSlug: "real-betis" },
      { teamName: "Sevilla", clubSlug: "sevilla" },
      { teamName: "Real Sociedad", clubSlug: "real-sociedad" },
      { teamName: "Villarreal", clubSlug: "villarreal" },
      { teamName: "Valencia", clubSlug: "valencia" },
      { teamName: "Athletic Club", clubSlug: "athletic-club" },
    ],
  },
  {
    slug: "serie-a-it",
    name: "Serie A",
    image: "/leagues/serie-a-it.png",
    clubs: [
      { teamName: "AC Milan", clubSlug: "ac-milan" },
      { teamName: "Inter Milan", clubSlug: "inter-milan" },
      { teamName: "Juventus", clubSlug: "juventus" },
      { teamName: "Napoli", clubSlug: "napoli" },
      { teamName: "AS Roma", clubSlug: "roma" },
      { teamName: "Lazio", clubSlug: "lazio" },
      { teamName: "Atalanta", clubSlug: "atalanta" },
    ],
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    image: "/leagues/bundesliga.png",
    clubs: [
      { teamName: "Bayern Munich", clubSlug: "bayern-munich" },
      { teamName: "Borussia Dortmund", clubSlug: "borussia-dortmund" },
      { teamName: "RB Leipzig", clubSlug: "rb-leipzig" },
      { teamName: "Bayer Leverkusen", clubSlug: "bayer-leverkusen" },
      { teamName: "Eintracht Frankfurt", clubSlug: "eintracht-frankfurt" },
    ],
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    image: "/leagues/ligue-1.png",
    clubs: [
      { teamName: "Paris Saint-Germain", clubSlug: "psg" },
      { teamName: "Olympique de Marseille", clubSlug: "marseille" },
      { teamName: "Olympique Lyonnais", clubSlug: "lyon" },
      { teamName: "AS Monaco", clubSlug: "monaco" },
      { teamName: "Lille OSC", clubSlug: "lille" },
    ],
  },
  {
    slug: "eredivisie",
    name: "Eredivisie",
    image: "/leagues/eredivisie.png",
    clubs: [
      { teamName: "Ajax", clubSlug: "ajax" },
      { teamName: "PSV", clubSlug: "psv" },
      { teamName: "Feyenoord", clubSlug: "feyenoord" },
    ],
  },
  {
    slug: "primeira-liga-pt",
    name: "Primeira Liga (PT)",
    image: "/leagues/primeira-liga-pt.png",
    clubs: [
      { teamName: "SL Benfica", clubSlug: "benfica" },
      { teamName: "FC Porto", clubSlug: "porto" },
      { teamName: "Sporting CP", clubSlug: "sporting" },
      { teamName: "SC Braga", clubSlug: "braga" },
      { teamName: "Vitória SC", clubSlug: "vitoria-guimaraes" },
    ],
  },
  {
    slug: "scottish-premiership",
    name: "Scottish Premiership",
    image: "/leagues/scottish-premiership.png",
    clubs: [
      { teamName: "Celtic", clubSlug: "celtic" },
      { teamName: "Rangers", clubSlug: "rangers" },
    ],
  },
  {
    slug: "brasileirao",
    name: "Brasileirão",
    image: "/leagues/brasileirao.png",
    clubs: [
      { teamName: "Flamengo", clubSlug: "flamengo" },
      { teamName: "Fluminense", clubSlug: "fluminense" },
      { teamName: "Palmeiras", clubSlug: "palmeiras" },
      { teamName: "Corinthians", clubSlug: "corinthians" },
      { teamName: "São Paulo", clubSlug: "sao-paulo" },
      { teamName: "Santos", clubSlug: "santos" },
    ],
  },
  {
    slug: "super-lig-tr",
    name: "Süper Lig (TR)",
    image: "/leagues/super-lig-tr.png",
    clubs: [
      { teamName: "Galatasaray", clubSlug: "galatasaray" },
      { teamName: "Fenerbahçe", clubSlug: "fenerbahce" },
      { teamName: "Beşiktaş", clubSlug: "besiktas" },
      { teamName: "Trabzonspor", clubSlug: "trabzonspor" },
    ],
  },
  {
    slug: "saudi-pro-league",
    name: "Saudi Pro League",
    image: "/leagues/saudi-pro-league.png",
    clubs: [
      { teamName: "Al Nassr", clubSlug: "al-nassr" },
      { teamName: "Al Hilal", clubSlug: "al-hilal" },
      { teamName: "Al Ittihad", clubSlug: "al-ittihad" },
      { teamName: "Al Ahli", clubSlug: "al-ahli" },
    ],
  },
  {
    slug: "mls",
    name: "MLS",
    image: "/leagues/mls.png",
    clubs: [
      { teamName: "Inter Miami", clubSlug: "inter-miami" },
      { teamName: "LA Galaxy", clubSlug: "la-galaxy" },
      { teamName: "Los Angeles FC", clubSlug: "lafc" },
      { teamName: "New York City FC", clubSlug: "nycfc" },
    ],
  },
];

export const TEAM_TO_LEAGUE = (() => {
  const map = new Map<string, string>();
  for (const league of LEAGUES_CONFIG) {
    for (const club of league.clubs) {
      map.set(club.teamName, league.slug);
    }
  }
  return map;
})();
