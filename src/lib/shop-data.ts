// src/lib/shop-data.ts

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
    "genoa","cremonese","udinese","pisa","lecce",
    "cagliari","hellas-verona","como","sassuolo","parma"
  ],
  "bundesliga": [
    "bayern-munich","borussia-dortmund","rb-leipzig","bayer-leverkusen","vfb-stuttgart",
    "eintracht-frankfurt","sc-freiburg","union-berlin","wolfsburg","mainz-05",
    "augsburg","borussia-monchengladbach","heidenheim","werder-bremen",
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

export function clubImg(league: LeagueKey, club: string) {
  return `/assets/clubs/${league}/${club}.png`;
}
