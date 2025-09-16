// Mapa de slug -> nome oficial da equipa (compatível com Product.team)
export const clubSlugToTeamName: Record<string, string> = {
  // La Liga
  'real-madrid': 'Real Madrid',
  'barcelona': 'FC Barcelona',
  'atletico-madrid': 'Atlético de Madrid',
  'real-betis': 'Real Betis',
  'sevilla': 'Sevilla FC',
  'real-sociedad': 'Real Sociedad',
  'villarreal': 'Villarreal',

  // Primeira Liga
  'benfica': 'SL Benfica',
  'sporting': 'Sporting CP',
  'porto': 'FC Porto',
  'braga': 'SC Braga',
  'vitoria-sc': 'Vitória SC',
};

// fallback: Title Case do slug
export function teamNameFromSlug(slug: string): string {
  const hit = clubSlugToTeamName[slug];
  if (hit) return hit;
  return slug
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
