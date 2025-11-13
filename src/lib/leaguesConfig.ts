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
      { slug: "bournemouth", name: "AFC Bournemouth" },
      { slug: "brentford", name: "Brentford" },
      { slug: "brighton", name: "Brighton & Hove Albion" },
      { slug: "chelsea", name: "Chelsea" },
      { slug: "crystal-palace", name: "Crystal Palace" },
      { slug: "everton", name: "Everton" },
      { slug: "fulham", name: "Fulham" },
      { slug: "ipswich-town", name: "Ipswich Town" },
      { slug: "leicester-city", name: "Leicester City" },
      { slug: "liverpool", name: "Liverpool" },
      { slug: "manchester-city", name: "Manchester City" },
      { slug: "manchester-united", name: "Manchester United" },
      { slug: "newcastle-united", name: "Newcastle United" },
      { slug: "nottingham-forest", name: "Nottingham Forest" },
      { slug: "southampton", name: "Southampton" },
      { slug: "tottenham", name: "Tottenham Hotspur" },
      { slug: "west-ham", name: "West Ham United" },
      { slug: "wolves", name: "Wolverhampton Wanderers" },
    ],
  },

  // ===================== LA LIGA =====================
  {
    slug: "la-liga",
    name: "La Liga",
    country: "Spain",
    image: "/assets/leagues/la-liga.png",
    clubs: [
      { slug: "athletic-club", name: "Athletic Club" },
      { slug: "atletico-madrid", name: "Atlético de Madrid" },
      { slug: "osasuna", name: "CA Osasuna" },
      { slug: "celta-vigo", name: "RC Celta de Vigo" },
      { slug: "alaves", name: "Deportivo Alavés" },
      { slug: "elche", name: "Elche CF" },
      { slug: "barcelona", name: "FC Barcelona" },
      { slug: "getafe", name: "Getafe CF" },
      { slug: "girona", name: "Girona FC" },
      { slug: "levante", name: "Levante UD" },
      { slug: "rayo-vallecano", name: "Rayo Vallecano" },
      { slug: "espanyol", name: "RCD Espanyol" },
      { slug: "mallorca", name: "RCD Mallorca" },
      { slug: "real-betis", name: "Real Betis" },
      { slug: "real-madrid", name: "Real Madrid" },
      { slug: "real-oviedo", name: "Real Oviedo" },
      { slug: "real-sociedad", name: "Real Sociedad" },
      { slug: "sevilla", name: "Sevilla FC" },
      { slug: "valencia", name: "Valencia CF" },
      { slug: "villarreal", name: "Villarreal CF" },
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
      { slug: "hellas-verona", name: "Hellas Verona" },
      { slug: "inter", name: "Inter Milan" },
      { slug: "juventus", name: "Juventus" },
      { slug: "lazio", name: "Lazio" },
      { slug: "lecce", name: "Lecce" },
      { slug: "ac-milan", name: "AC Milan" },
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
      { slug: "augsburg", name: "FC Augsburg" },
      { slug: "union-berlin", name: "Union Berlin" },
      { slug: "werder-bremen", name: "Werder Bremen" },
      { slug: "borussia-dortmund", name: "Borussia Dortmund" },
      { slug: "eintracht-frankfurt", name: "Eintracht Frankfurt" },
      { slug: "sc-freiburg", name: "SC Freiburg" },
      { slug: "hamburg", name: "Hamburger SV" },
      { slug: "heidenheim", name: "1. FC Heidenheim" },
      { slug: "hoffenheim", name: "TSG Hoffenheim" },
      { slug: "koln", name: "1. FC Köln" },
      { slug: "rb-leipzig", name: "RB Leipzig" },
      { slug: "bayer-leverkusen", name: "Bayer Leverkusen" },
      { slug: "mainz-05", name: "1. FSV Mainz 05" },
      { slug: "monchengladbach", name: "Borussia Mönchengladbach" },
      { slug: "bayern-munich", name: "Bayern Munich" },
      { slug: "st-pauli", name: "FC St. Pauli" },
      { slug: "vfb-stuttgart", name: "VfB Stuttgart" },
      { slug: "wolfsburg", name: "VfL Wolfsburg" },
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
      { slug: "paris-fc", name: "Paris FC" },
      { slug: "psg", name: "Paris Saint-Germain" },
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
      { slug: "groningen", name: "FC Groningen" },
      { slug: "heerenveen", name: "SC Heerenveen" },
      { slug: "heracles", name: "Heracles Almelo" },
      { slug: "nac-breda", name: "NAC Breda" },
      { slug: "nec", name: "NEC Nijmegen" },
      { slug: "pec-zwolle", name: "PEC Zwolle" },
      { slug: "psv", name: "PSV Eindhoven" },
      { slug: "telstar", name: "Telstar" },
      { slug: "twente", name: "FC Twente" },
      { slug: "utrecht", name: "FC Utrecht" },
      { slug: "volendam", name: "FC Volendam" },
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
      { slug: "benfica", name: "SL Benfica" },
      { slug: "braga", name: "SC Braga" },
      { slug: "casa-pia", name: "Casa Pia" },
      { slug: "estoril", name: "Estoril Praia" },
      { slug: "estrela-amadora", name: "Estrela da Amadora" },
      { slug: "famalicao", name: "Famalicão" },
      { slug: "gil-vicente", name: "Gil Vicente" },
      { slug: "moreirense", name: "Moreirense" },
      { slug: "nacional", name: "Nacional" },
      { slug: "porto", name: "FC Porto" },
      { slug: "rio-ave", name: "Rio Ave" },
      { slug: "santa-clara", name: "Santa Clara" },
      { slug: "sporting", name: "Sporting CP" },
      { slug: "tondela", name: "Tondela" },
      { slug: "vitoria-guimaraes", name: "Vitória SC" },
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
      { slug: "hearts", name: "Heart of Midlothian" },
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
      { slug: "vasco-da-gama", name: "Vasco da Gama" },
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
      { slug: "fatih-karagumruk", name: "Fatih Karagümrük" },
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
      { slug: "neom-sc", name: "Neom SC" },
    ],
  },

  // ===================== MLS =====================
  {
    slug: "mls",
    name: "Major League Soccer",
    country: "USA & Canada",
    image: "/assets/leagues/mls.png",
    clubs: [
      { slug: "atlanta-united", name: "Atlanta United FC" },
      { slug: "austin-fc", name: "Austin FC" },
      { slug: "cf-montreal", name: "CF Montréal" },
      { slug: "charlotte-fc", name: "Charlotte FC" },
      { slug: "chicago-fire", name: "Chicago Fire FC" },
      { slug: "colorado-rapids", name: "Colorado Rapids" },
      { slug: "columbus-crew", name: "Columbus Crew" },
      { slug: "dc-united", name: "D.C. United" },
      { slug: "fc-cincinnati", name: "FC Cincinnati" },
      { slug: "fc-dallas", name: "FC Dallas" },
      { slug: "houston-dynamo", name: "Houston Dynamo FC" },
      { slug: "inter-miami", name: "Inter Miami CF" },
      { slug: "la-galaxy", name: "LA Galaxy" },
      { slug: "lafc", name: "Los Angeles FC" },
      { slug: "minnesota-united", name: "Minnesota United FC" },
      { slug: "nashville-sc", name: "Nashville SC" },
      { slug: "new-england-revolution", name: "New England Revolution" },
      { slug: "nycfc", name: "New York City FC" },
      { slug: "ny-red-bulls", name: "New York Red Bulls" },
      { slug: "orlando-city", name: "Orlando City SC" },
      { slug: "philadelphia-union", name: "Philadelphia Union" },
      { slug: "portland-timbers", name: "Portland Timbers" },
      { slug: "real-salt-lake", name: "Real Salt Lake" },
      { slug: "san-diego-fc", name: "San Diego FC" },
      { slug: "san-jose-earthquakes", name: "San Jose Earthquakes" },
      { slug: "seattle-sounders", name: "Seattle Sounders FC" },
      { slug: "sporting-kc", name: "Sporting Kansas City" },
      { slug: "st-louis-city", name: "St. Louis City SC" },
      { slug: "toronto-fc", name: "Toronto FC" },
      { slug: "vancouver-whitecaps", name: "Vancouver Whitecaps FC" },
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
