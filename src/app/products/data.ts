// src/app/products/data.ts
// Módulo PARTILHADO de dados/auxiliares para Products/Clubs.
// ⚠️ Não colocar React ou "use client" aqui.

export type LeagueKey =
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "eredivisie"
  | "primeira-liga"
  | "scottish-premiership"
  | "brasileirao";

/* ---------------- Players (para UI que precisar) ---------------- */
export const players = [
  { id: "cristiano-ronaldo", name: "Cristiano Ronaldo", img: "/assets/players/cristiano.png" },
  { id: "lionel-messi",      name: "Lionel Messi",      img: "/assets/players/messi.png" },
  { id: "neymar-jr",         name: "Neymar Jr",         img: "/assets/players/neymar.png" },
  { id: "kylian-mbappe",     name: "Kylian Mbappé",     img: "/assets/players/mbappe.png" },
  { id: "erling-haaland",    name: "Erling Haaland",    img: "/assets/players/haaland.png" },

  { id: "kevin-de-bruyne",   name: "Kevin De Bruyne",   img: "/assets/players/kevin-de-bruyne.png" },
  { id: "vinicius-jr",       name: "Vinícius Jr",       img: "/assets/players/vinicius-jr.png" },
  { id: "luka-modric",       name: "Luka Modrić",       img: "/assets/players/modric.png" },
  { id: "mohamed-salah",     name: "Mohamed Salah",     img: "/assets/players/salah.png" },
  { id: "jude-bellingham",   name: "Jude Bellingham",   img: "/assets/players/bellingham.png" },
  { id: "robert-lewandowski",name: "Robert Lewandowski",img: "/assets/players/lewandowski.png" },
  { id: "antoine-griezmann", name: "Antoine Griezmann", img: "/assets/players/griezmann.png" },
  { id: "harry-kane",        name: "Harry Kane",        img: "/assets/players/kane.png" },
  { id: "bruno-fernandes",   name: "Bruno Fernandes",   img: "/assets/players/bruno-fernandes.png" },
  { id: "joao-felix",        name: "João Félix",        img: "/assets/players/felix.png" },
];

/* ---------------- Ligas / Clubes ---------------- */
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
];

export const leagueClubs: Record<LeagueKey, string[]> = {
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

/** Devolve a imagem do escudo/cover do clube (ajusta path conforme os teus assets) */
export function clubImg(league: LeagueKey, club: string) {
  return `/assets/clubs/${league}/${club}.png`;
}

/** Alguns clubes em destaque para cards rápidos na UI */
export const featuredClubs: { league: LeagueKey; club: string; name: string }[] = [
  { league: "la-liga",        club: "real-madrid",     name: "Real Madrid" },
  { league: "premier-league", club: "manchester-city", name: "Manchester City" },
  { league: "bundesliga",     club: "bayern-munich",   name: "Bayern Munich" },
  { league: "ligue-1",        club: "psg",             name: "Paris Saint-Germain" },
  { league: "serie-a",        club: "inter",           name: "Inter" },
];
