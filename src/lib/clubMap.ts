// src/lib/clubMap.ts
// Barrel file: reexporta tudo o que a app precisa a partir de shop-data,
// evitando duplicações (especialmente da função clubImg).

export type { LeagueKey } from "./shop-data";

export {
  // dados de ligas e clubes
  leaguesOrder,
  leagueClubs,

  // nomes e mapeamentos
  clubSlugToTeamName,
  teamNameFromSlug,
  slugFromTeamName,

  // imagens (usa normalização de nome/slug)
  clubImg,
  fromTeamName,
} from "./shop-data";
