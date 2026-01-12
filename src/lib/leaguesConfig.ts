// src/lib/leaguesConfig.ts

/**
 * Config de leagues e clubes.
 * - name  => tem de bater com Product.team
 * - slug  => usado em /clubs/[slug]
 * - image => caminho em public/assets/leagues
 */

export type LeagueSlug =
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "eredivisie"
  | "primeira-liga"
  | "scottish-premiership"
  | "brasileirao"
  | "super-lig"
  | "saudi-pro-league"
  | "mls";

export interface ClubConfig {
  slug: string;
  name: string;
}

export interface LeagueConfig {
  slug: LeagueSlug;
  name: string;
  country: string;
  image: string;
  clubs: ClubConfig[];
}

export const LEAGUES_CONFIG: LeagueConfig[] = [
  // ===================== PREMIER LEAGUE =====================
  {
    slug: "premier-league",
    name: "Premier League",
    country: "England",
    image: "/assets/leagues/premier-league.png",
    clubs: [
      { slug: "arsenal", name: "Arsenal" },
      { slug: "aston-villa", name: "Aston Villa" },
      { slug: "bournemouth", name: "Bournemouth" },
      { slug: "brentford", name: "Brentford" },
      { slug: "brighton", name: "Brighton" },
      { slug: "chelsea", name: "Chelsea" },
      { slug: "crystal-palace", name: "Crystal Palace" },
      { slug: "everton", name: "Everton" },
      { slug: "fulham", name: "Fulham" },
      { slug: "ipswich-town", name: "Ipswich" },
      { slug: "leicester-city", name: "Leicester" },
      { slug: "liverpool", name: "Liverpool" },
      { slug: "manchester-city", name: "Manchester City" },
      { slug: "manchester-united", name: "Manchester United" },
      { slug: "newcastle-united", name: "Newcastle" },
      { slug: "nottingham-forest", name: "Nottingham Forest" },
      { slug: "southampton", name: "Southampton" },
      { slug: "tottenham", name: "Tottenham" },
      { slug: "west-ham", name: "West Ham" },
      { slug: "wolves", name: "Wolves" },
    ],
  },

  // ===================== LA LIGA =====================
  {
    slug: "la-liga",
    name: "La Liga",
    country: "Spain",
    image: "/assets/leagues/la-liga.png",
    clubs: [
      { slug: "athletic-club", name: "Athletic" },
      { slug: "atletico-madrid", name: "Atlético de Madrid" },
      { slug: "osasuna", name: "Osasuna" },
      { slug: "celta-vigo", name: "Celta" },
      { slug: "alaves", name: "Alavés" },
      { slug: "elche", name: "Elche" },
      { slug: "barcelona", name: "Barcelona" },
      { slug: "getafe", name: "Getafe" },
      { slug: "girona", name: "Girona" },
      { slug: "levante", name: "Levante" },
      { slug: "rayo-vallecano", name: "Rayo Vallecano" },
      { slug: "espanyol", name: "Espanyol" },
      { slug: "mallorca", name: "Mallorca" },
      { slug: "real-betis", name: "Real Betis" },
      { slug: "real-madrid", name: "Real Madrid" },
      { slug: "real-oviedo", name: "Real Oviedo" },
      { slug: "real-sociedad", name: "Real Sociedad" },
      { slug: "sevilla", name: "Sevilla" },
      { slug: "valencia", name: "Valencia" },
      { slug: "villarreal", name: "Villarreal" },
    ],
  },

  // ===================== SERIE A =====================
  {
    slug: "serie-a",
    name: "Serie A",
    country: "Italy",
    image: "/assets/leagues/serie-a.png",
    clubs: [
      { slug: "atalanta", name: "Atalanta" },
      { slug: "bologna", name: "Bologna" },
      { slug: "cagliari", name: "Cagliari" },
      { slug: "cremonese", name: "Cremonese" },
      { slug: "como", name: "Como" },
      { slug: "fiorentina", name: "Fiorentina" },
      { slug: "genoa", name: "Genoa" },
      { slug: "hellas-verona", name: "Verona" },
      { slug: "inter-milan", name: "Inter Milan" },
      { slug: "juventus", name: "Juventus" },
      { slug: "lazio", name: "Lazio" },
      { slug: "lecce", name: "Lecce" },
      { slug: "milan", name: "Milan" },
      { slug: "napoli", name: "Napoli" },
      { slug: "parma", name: "Parma" },
      { slug: "pisa", name: "Pisa" },
      { slug: "roma", name: "Roma" },
      { slug: "sassuolo", name: "Sassuolo" },
      { slug: "torino", name: "Torino" },
      { slug: "udinese", name: "Udinese" },
    ],
  },

  // ===================== BUNDESLIGA =====================
  {
    slug: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    image: "/assets/leagues/bundesliga.png",
    clubs: [
      { slug: "augsburg", name: "Augsburg" },
      { slug: "union-berlin", name: "Union Berlin" },
      { slug: "werder-bremen", name: "Werder Bremen" },
      { slug: "dortmund", name: "Dortmund" },
      { slug: "frankfurt", name: "Frankfurt" },
      { slug: "sc-freiburg", name: "Freiburg" },
      { slug: "hamburg", name: "Hamburg" },
      { slug: "heidenheim", name: "Heidenheim" },
      { slug: "hoffenheim", name: "Hoffenheim" },
      { slug: "koln", name: "Köln" },
      { slug: "rb-leipzig", name: "Leipzig" },
      { slug: "leverkusen", name: "Leverkusen" },
      { slug: "mainz-05", name: "Mainz" },
      { slug: "monchengladbach", name: "Mönchengladbach" },
      { slug: "bayern", name: "Bayern" },
      { slug: "st-pauli", name: "St. Pauli" },
      { slug: "vfb-stuttgart", name: "Stuttgart" },
      { slug: "wolfsburg", name: "Wolfsburg" },
    ],
  },

  // ===================== LIGUE 1 =====================
  {
    slug: "ligue-1",
    name: "Ligue 1",
    country: "France",
    image: "/assets/leagues/ligue-1.png",
    clubs: [
      { slug: "angers", name: "Angers" },
      { slug: "auxerre", name: "Auxerre" },
      { slug: "brest", name: "Brest" },
      { slug: "le-havre", name: "Le Havre" },
      { slug: "lens", name: "Lens" },
      { slug: "lille", name: "Lille" },
      { slug: "lorient", name: "Lorient" },
      { slug: "lyon", name: "Lyon" },
      { slug: "marseille", name: "Marseille" },
      { slug: "metz", name: "Metz" },
      { slug: "monaco", name: "Monaco" },
      { slug: "nantes", name: "Nantes" },
      { slug: "nice", name: "Nice" },
      { slug: "paris-fc", name: "Paris" },
      { slug: "psg", name: "PSG" },
      { slug: "rennes", name: "Rennes" },
      { slug: "strasbourg", name: "Strasbourg" },
      { slug: "toulouse", name: "Toulouse" },
    ],
  },

  // ===================== EREDIVISIE =====================
  {
    slug: "eredivisie",
    name: "Eredivisie",
    country: "Netherlands",
    image: "/assets/leagues/eredivisie.png",
    clubs: [
      { slug: "ajax", name: "Ajax" },
      { slug: "az-alkmaar", name: "AZ Alkmaar" },
      { slug: "fortuna-sittard", name: "Fortuna Sittard" },
      { slug: "go-ahead-eagles", name: "Go Ahead Eagles" },
      { slug: "groningen", name: "Groningen" },
      { slug: "heerenveen", name: "Heerenveen" },
      { slug: "heracles", name: "Heracles" },
      { slug: "nac-breda", name: "NAC Breda" },
      { slug: "nec", name: "NEC" },
      { slug: "pec-zwolle", name: "PEC Zwolle" },
      { slug: "psv", name: "PSV" },
      { slug: "telstar", name: "Telstar" },
      { slug: "twente", name: "Twente" },
      { slug: "utrecht", name: "Utrecht" },
      { slug: "volendam", name: "Volendam" },
      { slug: "excelsior", name: "Excelsior" },
      { slug: "feyenoord", name: "Feyenoord" },
      { slug: "sparta-rotterdam", name: "Sparta Rotterdam" },
    ],
  },

  // ===================== PRIMEIRA LIGA =====================
  {
    slug: "primeira-liga",
    name: "Primeira Liga",
    country: "Portugal",
    image: "/assets/leagues/primeira-liga.png",
    clubs: [
      { slug: "alverca", name: "Alverca" },
      { slug: "arouca", name: "Arouca" },
      { slug: "avs", name: "AVS" },
      { slug: "benfica", name: "Benfica" },
      { slug: "braga", name: "Braga" },
      { slug: "casa-pia", name: "Casa Pia" },
      { slug: "estoril", name: "Estoril" },
      { slug: "estrela-amadora", name: "Estrela" },
      { slug: "famalicao", name: "Famalicão" },
      { slug: "gil-vicente", name: "Gil Vicente" },
      { slug: "moreirense", name: "Moreirense" },
      { slug: "nacional", name: "Nacional" },
      { slug: "porto", name: "Porto" },
      { slug: "rio-ave", name: "Rio Ave" },
      { slug: "santa-clara", name: "Santa Clara" },
      { slug: "sporting", name: "Sporting" },
      { slug: "tondela", name: "Tondela" },
      { slug: "vitoria-guimaraes", name: "Vitória de Guimarães" },
    ],
  },

  // ===================== SCOTTISH PREMIERSHIP =====================
  {
    slug: "scottish-premiership",
    name: "Scottish Premiership",
    country: "Scotland",
    image: "/assets/leagues/scottish-premiership.png",
    clubs: [
      { slug: "aberdeen", name: "Aberdeen" },
      { slug: "celtic", name: "Celtic" },
      { slug: "dundee", name: "Dundee" },
      { slug: "dundee-united", name: "Dundee United" },
      { slug: "falkirk", name: "Falkirk" },
      { slug: "hearts", name: "Hearts" },
      { slug: "hibernian", name: "Hibernian" },
      { slug: "kilmarnock", name: "Kilmarnock" },
      { slug: "livingston", name: "Livingston" },
      { slug: "motherwell", name: "Motherwell" },
      { slug: "rangers", name: "Rangers" },
      { slug: "st-mirren", name: "St Mirren" },
    ],
  },

  // ===================== BRASILEIRÃO =====================
  {
    slug: "brasileirao",
    name: "Campeonato Brasileiro Série A",
    country: "Brazil",
    image: "/assets/leagues/brasileirao.png",
    clubs: [
      { slug: "atletico-mineiro", name: "Atlético Mineiro" },
      { slug: "bahia", name: "Bahia" },
      { slug: "botafogo", name: "Botafogo" },
      { slug: "ceara", name: "Ceará" },
      { slug: "corinthians", name: "Corinthians" },
      { slug: "cruzeiro", name: "Cruzeiro" },
      { slug: "flamengo", name: "Flamengo" },
      { slug: "fluminense", name: "Fluminense" },
      { slug: "fortaleza", name: "Fortaleza" },
      { slug: "gremio", name: "Grêmio" },
      { slug: "internacional", name: "Internacional" },
      { slug: "juventude", name: "Juventude" },
      { slug: "mirassol", name: "Mirassol" },
      { slug: "palmeiras", name: "Palmeiras" },
      { slug: "red-bull-bragantino", name: "Red Bull Bragantino" },
      { slug: "santos", name: "Santos" },
      { slug: "sao-paulo", name: "São Paulo" },
      { slug: "sport-recife", name: "Sport Recife" },
      { slug: "vasco-da-gama", name: "Vasco" },
      { slug: "vitoria", name: "Vitória" },
    ],
  },

  // ===================== SÜPER LIG =====================
  {
    slug: "super-lig",
    name: "Süper Lig",
    country: "Turkey",
    image: "/assets/leagues/super-lig.png",
    clubs: [
      { slug: "alanyaspor", name: "Alanyaspor" },
      { slug: "antalyaspor", name: "Antalyaspor" },
      { slug: "basaksehir", name: "Başakşehir" },
      { slug: "besiktas", name: "Beşiktaş" },
      { slug: "eyupspor", name: "Eyüpspor" },
      { slug: "fatih-karagumruk", name: "Karagümrük" },
      { slug: "fenerbahce", name: "Fenerbahçe" },
      { slug: "galatasaray", name: "Galatasaray" },
      { slug: "gaziantep", name: "Gaziantep" },
      { slug: "genclerbirligi", name: "Gençlerbirliği" },
      { slug: "goztepe", name: "Göztepe" },
      { slug: "kasimpasa", name: "Kasımpaşa" },
      { slug: "kayserispor", name: "Kayserispor" },
      { slug: "kocaelispor", name: "Kocaelispor" },
      { slug: "konyaspor", name: "Konyaspor" },
      { slug: "rizespor", name: "Rizespor" },
      { slug: "samsunspor", name: "Samsunspor" },
      { slug: "trabzonspor", name: "Trabzonspor" },
    ],
  },

  // ===================== SAUDI PRO LEAGUE =====================
  {
    slug: "saudi-pro-league",
    name: "Saudi Pro League",
    country: "Saudi Arabia",
    image: "/assets/leagues/saudi-pro-league.png",
    clubs: [
      { slug: "al-ahli", name: "Al Ahli" },
      { slug: "al-ettifaq", name: "Al Ettifaq" },
      { slug: "al-fateh", name: "Al Fateh" },
      { slug: "al-fayha", name: "Al Fayha" },
      { slug: "al-hazem", name: "Al Hazem" },
      { slug: "al-hilal", name: "Al Hilal" },
      { slug: "al-ittihad", name: "Al Ittihad" },
      { slug: "al-khaleej", name: "Al Khaleej" },
      { slug: "al-kholood", name: "Al Kholood" },
      { slug: "al-najma", name: "Al Najma" },
      { slug: "al-nassr", name: "Al Nassr" },
      { slug: "al-okhdood", name: "Al Okhdood" },
      { slug: "al-qadsiah", name: "Al Qadsiah" },
      { slug: "al-riyadh", name: "Al Riyadh" },
      { slug: "al-shabab", name: "Al Shabab" },
      { slug: "al-taawoun", name: "Al Taawoun" },
      { slug: "damac", name: "Damac" },
      { slug: "neom-sc", name: "Neom" },
    ],
  },

  // ===================== MLS =====================
  {
    slug: "mls",
    name: "Major League Soccer",
    country: "USA & Canada",
    image: "/assets/leagues/mls.png",
    clubs: [
      { slug: "atlanta-united", name: "Atlanta United" },
      { slug: "austin-fc", name: "Austin" },
      { slug: "cf-montreal", name: "Montreal" },
      { slug: "charlotte-fc", name: "Charlotte" },
      { slug: "chicago-fire", name: "Chicago Fire" },
      { slug: "colorado-rapids", name: "Colorado Rapids" },
      { slug: "columbus-crew", name: "Columbus Crew" },
      { slug: "dc-united", name: "DC United" },
      { slug: "fc-cincinnati", name: "Cincinnati" },
      { slug: "fc-dallas", name: "Dallas" },
      { slug: "houston-dynamo", name: "Houston Dynamo" },
      { slug: "inter-miami", name: "Inter Miami" },
      { slug: "la-galaxy", name: "LA Galaxy" },
      { slug: "lafc", name: "LAFC" },
      { slug: "minnesota-united", name: "Minnesota United" },
      { slug: "nashville-sc", name: "Nashville" },
      { slug: "new-england-revolution", name: "New England" },
      { slug: "nycfc", name: "New York City" },
      { slug: "ny-red-bulls", name: "New York Red Bulls" },
      { slug: "orlando-city", name: "Orlando City" },
      { slug: "philadelphia-union", name: "Philadelphia Union" },
      { slug: "portland-timbers", name: "Portland Timbers" },
      { slug: "real-salt-lake", name: "Real Salt Lake" },
      { slug: "san-diego-fc", name: "San Diego" },
      { slug: "san-jose-earthquakes", name: "San Jose" },
      { slug: "seattle-sounders", name: "Seattle Sounders" },
      { slug: "sporting-kc", name: "Sporting Kansas City" },
      { slug: "st-louis-city", name: "St. Louis City" },
      { slug: "toronto-fc", name: "Toronto" },
      { slug: "vancouver-whitecaps", name: "Vancouver Whitecaps" },
    ],
  },
];

// ===== Mapas auxiliares =====

// team name (Product.team) -> league slug
export const TEAM_TO_LEAGUE = (() => {
  const map = new Map<string, LeagueSlug>();
  for (const league of LEAGUES_CONFIG) {
    for (const club of league.clubs) {
      map.set(club.name, league.slug);
    }
  }
  return map;
})();

// league slug -> league config
export const LEAGUES_BY_SLUG: Record<LeagueSlug, LeagueConfig> =
  LEAGUES_CONFIG.reduce((acc, league) => {
    acc[league.slug] = league;
    return acc;
  }, {} as Record<LeagueSlug, LeagueConfig>);
