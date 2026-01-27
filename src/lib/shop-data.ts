// src/lib/shop-data.ts

/* =========================== Tipos de Liga =========================== */
export type LeagueKey =
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

/* =========================== Ligas (ordem/UI) =========================== */
export const leaguesOrder: { key: LeagueKey; name: string; img: string }[] = [
  { key: "premier-league",       name: "Premier League",        img: "/assets/leagues/premier-league.png" },
  { key: "la-liga",              name: "La Liga",               img: "/assets/leagues/la-liga.png" },
  { key: "serie-a",              name: "Serie A",               img: "/assets/leagues/serie-a.png" },
  { key: "bundesliga",           name: "Bundesliga",            img: "/assets/leagues/bundesliga.png" },
  { key: "ligue-1",              name: "Ligue 1",               img: "/assets/leagues/ligue-1.png" },
  { key: "eredivisie",           name: "Eredivisie",            img: "/assets/leagues/eredivisie.png" },
  { key: "primeira-liga",        name: "Primeira Liga (PT)",    img: "/assets/leagues/primeira-liga.png" },
  { key: "scottish-premiership", name: "Scottish Premiership",  img: "/assets/leagues/scottish-premiership.png" },
  { key: "brasileirao",          name: "Brasileirão",           img: "/assets/leagues/brasileirao.png" },
  { key: "super-lig",            name: "Süper Lig (TR)",        img: "/assets/leagues/super-lig.png" },
  { key: "saudi-pro-league",     name: "Saudi Pro League",      img: "/assets/leagues/saudi-pro-league.png" },
  { key: "mls",                  name: "MLS",                   img: "/assets/leagues/mls.png" },
];

/* =========================== Slugs por Liga (para grelhas/listas) =========================== */
export const leagueClubs: Record<LeagueKey, string[]> = {
  "premier-league": [
    "arsenal","aston-villa","bournemouth","brentford","brighton",
    "chelsea","crystal-palace","everton","fulham","leeds-united",
    "burnley","liverpool","manchester-city","manchester-united","newcastle-united",
    "nottingham-forest","sunderland","tottenham","west-ham-united","wolverhampton-wanderers",
  ],
  "la-liga": [
    "real-madrid","barcelona","atletico-madrid","athletic-club","real-sociedad",
    "villarreal","real-betis","sevilla","valencia","girona",
    "getafe","celta-vigo","osasuna","rayo-vallecano","alaves",
    "mallorca","las-palmas","leganes","real-valladolid","espanyol",
  ],
  "serie-a": [
    "inter-milan","milan","juventus","napoli","roma",
    "lazio","atalanta","fiorentina","bologna","torino",
    "genoa","cremonese","udinese","pisa","lecce",
    "cagliari","hellas-verona","como","sassuolo","parma"
  ],
  "bundesliga": [
    "bayern","dortmund","rb-leipzig","leverkusen","vfb-stuttgart",
    "frankfurt","sc-freiburg","union-berlin","wolfsburg","mainz-05",
    "augsburg","monchengladbach","heidenheim","werder-bremen",
    "hoffenheim","1-fc-koln","hamburger-sv","st-pauli",
  ],
  "ligue-1": [
    "psg","marseille","lyon","monaco","lille",
    "nice","rennes","nantes","strasbourg","lens",
    "brest","toulouse","angers","auxerre","metz",
    "lorient","le-havre","paris-fc"
  ],
  "eredivisie": [
    "ajax","psv","feyenoord","az-alkmaar","fc-twente",
    "utrecht","heerenveen","nec-nijmegen","sparta-rotterdam","go-ahead-eagles",
    "pec-zwolle","heracles","fortuna-sittard","fc-groningen","nac-breda",
    "telstar","excelsior","fc-volendam"
  ],
  "primeira-liga": [
    "benfica","porto","sporting","braga","vitoria-sc",
    "rio-ave","famalicao","gil-vicente","casa-pia","moreirense",
    "arouca","estoril-praia","santa-clara",
    "estrela-da-amadora","tondela","avs-futebol-sad","nacional-da-madeira","alverca"
  ],
  "scottish-premiership": [
    "celtic","rangers","aberdeen","hearts","hibernian",
    "motherwell","st-mirren","kilmarnock","dundee","dundee-united",
    "livingston","falkirk",
  ],
  "brasileirao": [
    "flamengo","palmeiras","corinthians","sao-paulo","santos",
    "fluminense","botafogo","vasco-da-gama","cruzeiro","atletico-mineiro",
    "gremio","internacional","bahia","fortaleza","ceara",
    "sport-recife","juventude","mirassol","vitoria"
  ],
  "super-lig": [
    "alanyaspor","antalyaspor","basaksehir","besiktas","eyupspor",
    "fatih-karagumruk","fenerbahce","galatasaray","gaziantep","genclerbirligi",
    "goztepe","kasimpasa","kayserispor","kocaelispor","konyaspor",
    "rizespor","samsunspor","trabzonspor",
  ],
  "saudi-pro-league": [
    "al-ahli","al-ettifaq","al-fateh","al-fayha","al-hazem",
    "al-hilal","al-ittihad","al-khaleej","al-kholood","al-najma",
    "al-nassr","al-okhdood","al-qadsiah","al-riyadh","al-shabab",
    "al-taawoun","damac","neom",
  ],
  "mls": [
    "atlanta-united","austin-fc","charlotte-fc","chicago-fire","columbus-crew",
    "fc-cincinnati","dc-united","inter-miami","cf-montreal","nashville-sc",
    "new-england-revolution","new-york-red-bulls","new-york-city-fc","orlando-city","philadelphia-union",
    "toronto-fc","colorado-rapids","fc-dallas","houston-dynamo","sporting-kansas-city",
    "la-galaxy","los-angeles-fc","minnesota-united","portland-timbers","real-salt-lake",
    "san-diego-fc","san-jose-earthquakes","seattle-sounders","st-louis-city","vancouver-whitecaps",
  ],
};

/* =========================== Nome oficial por slug =========================== */
export const clubSlugToTeamName: Record<string, string> = {
  // Premier League
  "arsenal":"Arsenal","aston-villa":"Aston Villa","bournemouth":"AFC Bournemouth","brentford":"Brentford","brighton":"Brighton & Hove Albion",
  "chelsea":"Chelsea","crystal-palace":"Crystal Palace","everton":"Everton","fulham":"Fulham","leeds-united":"Leeds United",
  "burnley":"Burnley","liverpool":"Liverpool","manchester-city":"Manchester City","manchester-united":"Manchester United","newcastle-united":"Newcastle United",
  "nottingham-forest":"Nottingham Forest","sunderland":"Sunderland","tottenham":"Tottenham","west-ham-united":"West Ham United","wolverhampton-wanderers":"Wolverhampton Wanderers",

  // Scottish Premiership
  "celtic":"Celtic FC","rangers":"Rangers FC","aberdeen":"Aberdeen FC","hearts":"Heart of Midlothian","hibernian":"Hibernian FC",
  "motherwell":"Motherwell FC","st-mirren":"St Mirren","kilmarnock":"Kilmarnock FC","dundee":"Dundee FC","dundee-united":"Dundee United","livingston":"Livingston FC","falkirk":"Falkirk FC",

  // Primeira Liga
  "benfica":"SL Benfica","porto":"FC Porto","sporting":"Sporting CP","braga":"SC Braga","vitoria-sc":"Vitória SC",
  "rio-ave":"Rio Ave FC","famalicao":"FC Famalicão","gil-vicente":"Gil Vicente FC","casa-pia":"Casa Pia AC","moreirense":"Moreirense FC",
  "arouca":"FC Arouca","estoril-praia":"Estoril Praia","santa-clara":"CD Santa Clara","estrela-da-amadora":"Estrela da Amadora","tondela":"CD Tondela",
  "avs-futebol-sad":"AVS Futebol SAD","nacional-da-madeira":"CD Nacional","alverca":"FC Alverca",

  // La Liga
  "real-madrid":"Real Madrid","barcelona":"FC Barcelona","atletico-madrid":"Atlético de Madrid","athletic-club":"Athletic Club","real-sociedad":"Real Sociedad",
  "villarreal":"Villarreal","real-betis":"Real Betis","sevilla":"Sevilla FC","valencia":"Valencia CF","girona":"Girona FC","getafe":"Getafe CF","celta-vigo":"Celta de Vigo",
  "osasuna":"CA Osasuna","rayo-vallecano":"Rayo Vallecano","alaves":"Deportivo Alavés","mallorca":"RCD Mallorca","las-palmas":"UD Las Palmas",
  "leganes":"CD Leganés","real-valladolid":"Real Valladolid","espanyol":"RCD Espanyol",

  // Ligue 1
  "psg":"Paris Saint-Germain","marseille":"Olympique de Marseille","lyon":"Olympique Lyonnais","monaco":"AS Monaco","lille":"Lille OSC",
  "nice":"OGC Nice","rennes":"Stade Rennais","nantes":"FC Nantes","strasbourg":"RC Strasbourg Alsace","lens":"RC Lens","brest":"Stade Brestois 29",
  "toulouse":"Toulouse FC","angers":"Angers SCO","auxerre":"AJ Auxerre","metz":"FC Metz","lorient":"FC Lorient","le-havre":"Le Havre AC","paris-fc":"Paris FC",

  // Serie A
  "inter":"Inter","ac-milan":"AC Milan","juventus":"Juventus","napoli":"Napoli","roma":"AS Roma","lazio":"Lazio","atalanta":"Atalanta",
  "fiorentina":"Fiorentina","bologna":"Bologna","torino":"Torino","genoa":"Genoa","cremonese":"Cremonese","udinese":"Udinese","pisa":"Pisa",
  "lecce":"Lecce","cagliari":"Cagliari","hellas-verona":"Hellas Verona","como":"Como","sassuolo":"Sassuolo","parma":"Parma",

  // Bundesliga
  "bayern-munich":"FC Bayern München","borussia-dortmund":"Borussia Dortmund","rb-leipzig":"RB Leipzig","bayer-leverkusen":"Bayer 04 Leverkusen","vfb-stuttgart":"VfB Stuttgart",
  "eintracht-frankfurt":"Eintracht Frankfurt","sc-freiburg":"SC Freiburg","union-berlin":"1. FC Union Berlin","wolfsburg":"VfL Wolfsburg","mainz-05":"1. FSV Mainz 05",
  "augsburg":"FC Augsburg","borussia-monchengladbach":"Borussia Mönchengladbach","heidenheim":"1. FC Heidenheim","werder-bremen":"SV Werder Bremen",
  "hoffenheim":"TSG Hoffenheim","1-fc-koln":"1. FC Köln","hamburger-sv":"Hamburger SV","st-pauli":"FC St. Pauli",

  // MLS
  "atlanta-united":"Atlanta United","austin-fc":"Austin FC","charlotte-fc":"Charlotte FC","chicago-fire":"Chicago Fire","columbus-crew":"Columbus Crew",
  "fc-cincinnati":"FC Cincinnati","dc-united":"D.C. United","inter-miami":"Inter Miami CF","cf-montreal":"CF Montréal","nashville-sc":"Nashville SC",
  "new-england-revolution":"New England Revolution","new-york-red-bulls":"New York Red Bulls","new-york-city-fc":"New York City FC","orlando-city":"Orlando City SC",
  "philadelphia-union":"Philadelphia Union","toronto-fc":"Toronto FC","colorado-rapids":"Colorado Rapids","fc-dallas":"FC Dallas","houston-dynamo":"Houston Dynamo",
  "sporting-kansas-city":"Sporting Kansas City","la-galaxy":"LA Galaxy","los-angeles-fc":"Los Angeles FC","minnesota-united":"Minnesota United",
  "portland-timbers":"Portland Timbers","real-salt-lake":"Real Salt Lake","san-diego-fc":"San Diego FC","san-jose-earthquakes":"San Jose Earthquakes",
  "seattle-sounders":"Seattle Sounders FC","st-louis-city":"St. Louis City SC","vancouver-whitecaps":"Vancouver Whitecaps FC",

  // Brasileirão
  "flamengo":"CR Flamengo","palmeiras":"SE Palmeiras","corinthians":"SC Corinthians","sao-paulo":"São Paulo FC","santos":"Santos FC","fluminense":"Fluminense FC",
  "botafogo":"Botafogo","vasco-da-gama":"CR Vasco da Gama","cruzeiro":"Cruzeiro","atletico-mineiro":"Atlético Mineiro","gremio":"Grêmio","internacional":"SC Internacional",
  "bahia":"EC Bahia","fortaleza":"Fortaleza EC","ceara":"Ceará SC","sport-recife":"Sport Club do Recife","juventude":"EC Juventude","mirassol":"Mirassol","vitoria":"EC Vitória",

  // Süper Lig
  "alanyaspor":"Alanyaspor","antalyaspor":"Antalyaspor","basaksehir":"İstanbul Başakşehir","besiktas":"Beşiktaş JK","eyupspor":"Eyüpspor",
  "fatih-karagumruk":"Fatih Karagümrük","fenerbahce":"Fenerbahçe","galatasaray":"Galatasaray","gaziantep":"Gaziantep FK","genclerbirligi":"Gençlerbirliği",
  "goztepe":"Göztepe","kasimpasa":"Kasımpaşa","kayserispor":"Kayserispor","kocaelispor":"Kocaelispor","konyaspor":"Konyaspor","rizespor":"Çaykur Rizespor",
  "samsunspor":"Samsunspor","trabzonspor":"Trabzonspor",

  // Saudi Pro League
  "al-ahli":"Al-Ahli","al-ettifaq":"Al-Ettifaq","al-fateh":"Al-Fateh","al-fayha":"Al-Fayha","al-hazem":"Al-Hazem",
  "al-hilal":"Al-Hilal","al-ittihad":"Al-Ittihad","al-khaleej":"Al-Khaleej","al-kholood":"Al-Kholood","al-najma":"Al-Najma",
  "al-nassr":"Al-Nassr","al-okhdood":"Al-Okhdood","al-qadsiah":"Al-Qadsiah","al-riyadh":"Al-Riyadh","al-shabab":"Al-Shabab",
  "al-taawoun":"Al-Taawoun","damac":"Damac","neom":"NEOM FC",

  // Eredivisie
  "ajax":"AFC Ajax","psv":"PSV Eindhoven","feyenoord":"Feyenoord","az-alkmaar":"AZ Alkmaar","fc-twente":"FC Twente","utrecht":"FC Utrecht",
  "heerenveen":"SC Telstar","nec-nijmegen":"NEC Nijmegen","sparta-rotterdam":"Sparta Rotterdam","go-ahead-eagles":"Go Ahead Eagles",
  "pec-zwolle":"PEC Zwolle","heracles":"Heracles Almelo","fortuna-sittard":"Fortuna Sittard","fc-groningen":"FC Groningen","nac-breda":"NAC Breda",
  "telstar":"SC Telstar","excelsior":"Excelsior","fc-volendam":"FC Volendam",
};

/* =========================== Helpers de normalização =========================== */

// normaliza string e transforma em slug seguro
function normalizeForSlug(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// aliases úteis (inclui TODAS as variações de Atlético)
const NAME_ALIASES: Record<string, string> = {
  // Atlético de Madrid
  "atlético-de-madrid": "atletico-madrid",
  "atlético-madrid": "atletico-madrid",
  "atletico-de-madrid": "atletico-madrid",
  "atletico-madrid": "atletico-madrid",
  "atlético": "atletico-madrid",
  "atletico": "atletico-madrid",

  // Vitória de Guimarães
  "vitória-de-guimarães": "vitoria-sc",

  // Barcelona sem FC
  "barcelona": "barcelona",

  // Alguns atalhos populares
  "man-city": "manchester-city",
  "manchester-c": "manchester-city",
  "psg": "psg",
};

// nome-normalizado -> slug oficial
const NAME_TO_SLUG: Record<string, string> = (() => {
  const base: Record<string, string> = {};

  // mapeia nomes "bonitos" oficiais -> slug
  for (const [slug, pretty] of Object.entries(clubSlugToTeamName)) {
    base[normalizeForSlug(pretty)] = slug;
  }

  // ✅ CORREÇÃO: normalizar também as chaves dos aliases
  for (const [aliasRaw, slug] of Object.entries(NAME_ALIASES)) {
    base[normalizeForSlug(aliasRaw)] = slug;
  }

  return base;
})();

/** Garante que a string fornecida (nome ou slug) é devolvida como slug oficial */
function ensureSlug(input: string): string {
  const norm = normalizeForSlug(input);
  if (clubSlugToTeamName[norm]) return norm;         // já é slug oficial
  if (NAME_TO_SLUG[norm]) return NAME_TO_SLUG[norm]; // é nome/alias conhecido
  return norm; // fallback
}

/* =========================== API pública para UI =========================== */

/** Nome bonito para UI a partir do slug */
export function teamNameFromSlug(slug: string): string {
  const hit = clubSlugToTeamName[slug];
  if (hit) return hit;
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/** Converte um nome qualquer para slug oficial */
export function slugFromTeamName(name: string): string {
  return ensureSlug(name);
}

/** Caminho da imagem: aceita SLUG **ou** NOME e normaliza automaticamente */
export function clubImg(league: LeagueKey, clubOrName: string) {
  const slug = ensureSlug(clubOrName);
  return `/assets/clubs/${league}/${slug}.png`;
}

/** Útil quando tens só o nome: devolve {slug, name, img} prontos para UI */
export function fromTeamName(league: LeagueKey, teamName: string) {
  const slug = ensureSlug(teamName);
  return { slug, name: teamNameFromSlug(slug), img: clubImg(league, slug) };
}
