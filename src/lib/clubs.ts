// src/lib/clubs.ts

/** Slug consistente para nomes de clubes */
export function slugifyClub(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Caminho do logo do clube (não t-shirts).
 * Ajusta aqui se a tua pasta for diferente.
 * Ex.: public/img/clubs/real-madrid.png
 */
export function clubImagePath(slug: string): string {
  // Override para casos especiais (se quiseres mapear manualmente algum nome)
  const overrides: Record<string, string> = {
    // "athletic-club": "/img/clubs/athletic-bilbao.png",
  };

  if (overrides[slug]) return overrides[slug];

  return `/img/clubs/${slug}.png`;
}
