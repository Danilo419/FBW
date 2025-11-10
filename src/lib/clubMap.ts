// src/lib/club-names.ts (ou mantém no teu shop-data.ts se preferires)

/* ===================== Mapa slug -> nome oficial ===================== */
export const clubSlugToTeamName: Record<string, string> = {
  /* ======================== Premier League (Inglaterra) ======================== */
  "arsenal": "Arsenal",
  "aston-villa": "Aston Villa",
  "bournemouth": "AFC Bournemouth",
  "brentford": "Brentford",
  "brighton": "Brighton & Hove Albion",
  "chelsea": "Chelsea",
  "crystal-palace": "Crystal Palace",
  "everton": "Everton",
  "fulham": "Fulham",
  "leeds-united": "Leeds United",
  "burnley": "Burnley",
  "liverpool": "Liverpool",
  "manchester-city": "Manchester City",
  "manchester-united": "Manchester United",
  "newcastle-united": "Newcastle United",
  "nottingham-forest": "Nottingham Forest",
  "sunderland": "Sunderland",
  "tottenham-hotspur": "Tottenham Hotspur",
  "west-ham-united": "West Ham United",
  "wolverhampton-wanderers": "Wolverhampton Wanderers",

  /* ======================== Scottish Premiership (Escócia) ======================== */
  "celtic": "Celtic FC",
  "rangers": "Rangers FC",
  "aberdeen": "Aberdeen FC",
  "hearts": "Heart of Midlothian",
  "hibernian": "Hibernian FC",
  "motherwell": "Motherwell FC",
  "st-mirren": "St Mirren",
  "kilmarnock": "Kilmarnock FC",
  "dundee": "Dundee FC",
  "dundee-united": "Dundee United",
  "livingston": "Livingston FC",
  "falkirk": "Falkirk FC",

  /* ======================== Primeira Liga (Portugal) ======================== */
  "benfica": "SL Benfica",
  "porto": "FC Porto",
  "sporting": "Sporting CP",
  "braga": "SC Braga",
  "vitoria-sc": "Vitória SC",
  "rio-ave": "Rio Ave FC",
  "famalicao": "FC Famalicão",
  "gil-vicente": "Gil Vicente FC",
  "casa-pia": "Casa Pia AC",
  "moreirense": "Moreirense FC",
  "arouca": "FC Arouca",
  "estoril-praia": "Estoril Praia",
  "santa-clara": "CD Santa Clara",
  "estrela-da-amadora": "Estrela da Amadora",
  "tondela": "CD Tondela",
  "avs-futebol-sad": "AVS Futebol SAD",
  "nacional-da-madeira": "CD Nacional",
  "alverca": "FC Alverca",

  /* ======================== La Liga (Espanha) ======================== */
  "real-madrid": "Real Madrid",
  "barcelona": "FC Barcelona",
  "atletico-madrid": "Atlético de Madrid",
  "athletic-club": "Athletic Club",
  "real-sociedad": "Real Sociedad",
  "villarreal": "Villarreal",
  "real-betis": "Real Betis",
  "sevilla": "Sevilla FC",
  "valencia": "Valencia CF",
  "girona": "Girona FC",
  "getafe": "Getafe CF",
  "celta-vigo": "Celta de Vigo",
  "osasuna": "CA Osasuna",
  "rayo-vallecano": "Rayo Vallecano",
  "alaves": "Deportivo Alavés",
  "mallorca": "RCD Mallorca",
  "las-palmas": "UD Las Palmas",
  "leganes": "CD Leganés",
  "real-valladolid": "Real Valladolid",
  "espanyol": "RCD Espanyol",

  /* ======================== Ligue 1 (França) ======================== */
  "psg": "Paris Saint-Germain",
  "marseille": "Olympique de Marseille",
  "lyon": "Olympique Lyonnais",
  "monaco": "AS Monaco",
  "lille": "Lille OSC",
  "nice": "OGC Nice",
  "rennes": "Stade Rennais",
  "nantes": "FC Nantes",
  "strasbourg": "RC Strasbourg Alsace",
  "lens": "RC Lens",
  "brest": "Stade Brestois 29",
  "toulouse": "Toulouse FC",
  "angers": "Angers SCO",
  "auxerre": "AJ Auxerre",
  "metz": "FC Metz",
  "lorient": "FC Lorient",
  "le-havre": "Le Havre AC",
  "paris-fc": "Paris FC",

  /* ======================== Serie A (Itália) ======================== */
  "inter": "Inter",
  "ac-milan": "AC Milan",
  "juventus": "Juventus",
  "napoli": "Napoli",
  "roma": "AS Roma",
  "lazio": "Lazio",
  "atalanta": "Atalanta",
  "fiorentina": "Fiorentina",
  "bologna": "Bologna",
  "torino": "Torino",
  "genoa": "Genoa",
  "cremonese": "Cremonese",
  "udinese": "Udinese",
  "pisa": "Pisa",
  "lecce": "Lecce",
  "cagliari": "Cagliari",
  "hellas-verona": "Hellas Verona",
  "como": "Como",
  "sassuolo": "Sassuolo",
  "parma": "Parma",

  /* ======================== Bundesliga (Alemanha) ======================== */
  "bayern-munich": "FC Bayern München",
  "borussia-dortmund": "Borussia Dortmund",
  "rb-leipzig": "RB Leipzig",
  "bayer-leverkusen": "Bayer 04 Leverkusen",
  "vfb-stuttgart": "VfB Stuttgart",
  "eintracht-frankfurt": "Eintracht Frankfurt",
  "sc-freiburg": "SC Freiburg",
  "union-berlin": "1. FC Union Berlin",
  "wolfsburg": "VfL Wolfsburg",
  "mainz-05": "1. FSV Mainz 05",
  "augsburg": "FC Augsburg",
  "borussia-monchengladbach": "Borussia Mönchengladbach",
  "heidenheim": "1. FC Heidenheim",
  "werder-bremen": "SV Werder Bremen",
  "hoffenheim": "TSG Hoffenheim",
  "1-fc-koln": "1. FC Köln",
  "hamburger-sv": "Hamburger SV",
  "st-pauli": "FC St. Pauli",

  /* ======================== MLS (Estados Unidos) ======================== */
  "atlanta-united": "Atlanta United",
  "austin-fc": "Austin FC",
  "charlotte-fc": "Charlotte FC",
  "chicago-fire": "Chicago Fire",
  "columbus-crew": "Columbus Crew",
  "fc-cincinnati": "FC Cincinnati",
  "dc-united": "D.C. United",
  "inter-miami": "Inter Miami CF",
  "cf-montreal": "CF Montréal",
  "nashville-sc": "Nashville SC",
  "new-england-revolution": "New England Revolution",
  "new-york-red-bulls": "New York Red Bulls",
  "new-york-city-fc": "New York City FC",
  "orlando-city": "Orlando City SC",
  "philadelphia-union": "Philadelphia Union",
  "toronto-fc": "Toronto FC",
  "colorado-rapids": "Colorado Rapids",
  "fc-dallas": "FC Dallas",
  "houston-dynamo": "Houston Dynamo",
  "sporting-kansas-city": "Sporting Kansas City",
  "la-galaxy": "LA Galaxy",
  "los-angeles-fc": "Los Angeles FC",
  "minnesota-united": "Minnesota United",
  "portland-timbers": "Portland Timbers",
  "real-salt-lake": "Real Salt Lake",
  "san-diego-fc": "San Diego FC",
  "san-jose-earthquakes": "San Jose Earthquakes",
  "seattle-sounders": "Seattle Sounders FC",
  "st-louis-city": "St. Louis City SC",
  "vancouver-whitecaps": "Vancouver Whitecaps FC",

  /* ======================== Brasileirão (Brasil) ======================== */
  "flamengo": "CR Flamengo",
  "palmeiras": "SE Palmeiras",
  "corinthians": "SC Corinthians",
  "sao-paulo": "São Paulo FC",
  "santos": "Santos FC",
  "fluminense": "Fluminense FC",
  "botafogo": "Botafogo",
  "vasco-da-gama": "CR Vasco da Gama",
  "cruzeiro": "Cruzeiro",
  "atletico-mineiro": "Atlético Mineiro",
  "gremio": "Grêmio",
  "internacional": "SC Internacional",
  "bahia": "EC Bahia",
  "fortaleza": "Fortaleza EC",
  "ceara": "Ceará SC",
  "sport-recife": "Sport Club do Recife",
  "juventude": "EC Juventude",
  "mirassol": "Mirassol",
  "vitoria": "EC Vitória",

  /* ======================== Süper Lig (Turquia) ======================== */
  "alanyaspor": "Alanyaspor",
  "antalyaspor": "Antalyaspor",
  "basaksehir": "İstanbul Başakşehir",
  "besiktas": "Beşiktaş JK",
  "eyupspor": "Eyüpspor",
  "fatih-karagumruk": "Fatih Karagümrük",
  "fenerbahce": "Fenerbahçe",
  "galatasaray": "Galatasaray",
  "gaziantep": "Gaziantep FK",
  "genclerbirligi": "Gençlerbirliği",
  "goztepe": "Göztepe",
  "kasimpasa": "Kasımpaşa",
  "kayserispor": "Kayserispor",
  "kocaelispor": "Kocaelispor",
  "konyaspor": "Konyaspor",
  "rizespor": "Çaykur Rizespor",
  "samsunspor": "Samsunspor",
  "trabzonspor": "Trabzonspor",

  /* ======================== Saudi Pro League (Arábia Saudita) ======================== */
  "al-ahli": "Al-Ahli",
  "al-ettifaq": "Al-Ettifaq",
  "al-fateh": "Al-Fateh",
  "al-fayha": "Al-Fayha",
  "al-hazem": "Al-Hazem",
  "al-hilal": "Al-Hilal",
  "al-ittihad": "Al-Ittihad",
  "al-khaleej": "Al-Khaleej",
  "al-kholood": "Al-Kholood",
  "al-najma": "Al-Najma",
  "al-nassr": "Al-Nassr",
  "al-okhdood": "Al-Okhdood",
  "al-qadsiah": "Al-Qadsiah",
  "al-riyadh": "Al-Riyadh",
  "al-shabab": "Al-Shabab",
  "al-taawoun": "Al-Taawoun",
  "damac": "Damac",
  "neom": "NEOM FC",

  /* ======================== Eredivisie (Holanda) ======================== */
  "ajax": "AFC Ajax",
  "psv": "PSV Eindhoven",
  "feyenoord": "Feyenoord",
  "az-alkmaar": "AZ Alkmaar",
  "fc-twente": "FC Twente",
  "utrecht": "FC Utrecht",
  "heerenveen": "SC Heerenveen",
  "nec-nijmegen": "NEC Nijmegen",
  "sparta-rotterdam": "Sparta Rotterdam",
  "go-ahead-eagles": "Go Ahead Eagles",
  "pec-zwolle": "PEC Zwolle",
  "heracles": "Heracles Almelo",
  "fortuna-sittard": "Fortuna Sittard",
  "fc-groningen": "FC Groningen",
  "nac-breda": "NAC Breda",
  "telstar": "SC Telstar",
  "excelsior": "Excelsior",
  "fc-volendam": "FC Volendam",
};

/* ===================== Helpers de nome/slug/imagem ===================== */

// Normaliza para comparar/gerar slug (remove acentos, pontuação e espaços)
function normalizeForSlug(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Aliases para nomes comuns que diferem do oficial
// (Crucial para "Atlético de Madrid")
const NAME_ALIASES: Record<string, string> = {
  "atletico-madrid": "atletico-madrid",     // já correto
  "atletico-de-madrid": "atletico-madrid",
  "atletico": "atletico-madrid",
  "atletico-madri": "atletico-madrid",
  "atlético-madrid": "atletico-madrid",
  "atlético-de-madrid": "atletico-madrid",

  // Barcelona: aceitar sem "FC"
  "barcelona": "barcelona",

  // Outros exemplos úteis (podes ampliar conforme fores vendo dados reais)
  "psg": "psg",
  "man-city": "manchester-city",
  "manchester-c": "manchester-city",
};

// Gera um mapa nome-normalizado -> slug oficial
const NAME_TO_SLUG: Record<string, string> = (() => {
  const base: Record<string, string> = {};
  for (const [slug, pretty] of Object.entries(clubSlugToTeamName)) {
    base[normalizeForSlug(pretty)] = slug;
  }
  // Aplica aliases
  for (const [aliasNorm, slug] of Object.entries(NAME_ALIASES)) {
    base[aliasNorm] = slug;
  }
  return base;
})();

/** Converte um nome qualquer (com/sem acentos, com/sem "FC") para o slug oficial */
export function slugFromTeamName(name: string): string {
  const key = normalizeForSlug(name);
  return NAME_TO_SLUG[key] ?? key; // fallback slugificado
}

/** Nome bonito para UI a partir do slug */
export function teamNameFromSlug(slug: string): string {
  const hit = clubSlugToTeamName[slug];
  if (hit) return hit;
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/** Caminho de imagem a partir do league key + slug */
export function clubImg(league: string, slug: string) {
  return `/assets/clubs/${league}/${slug}.png`;
}

/** Caminho de imagem a partir do league key + nome do clube (qualquer variação) */
export function clubImgByTeamName(league: string, teamName: string) {
  const slug = slugFromTeamName(teamName);
  return clubImg(league, slug);
}
