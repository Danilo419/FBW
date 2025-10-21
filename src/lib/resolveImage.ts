import fs from "fs";
import path from "path";

/**
 * Se a imagem original (.png/.jpg) não existir em /public,
 * tenta automaticamente a versão .webp; se também não existir,
 * devolve o caminho original.
 */
export function resolveImage(p: string | null | undefined) {
  if (!p) return "/placeholder.png";
  if (!p.startsWith("/")) return p;

  const abs = path.join(process.cwd(), "public", p);
  if (fs.existsSync(abs)) return p;

  const webp = p.replace(/\.(png|jpe?g)$/i, ".webp");
  const absWebp = path.join(process.cwd(), "public", webp);
  return fs.existsSync(absWebp) ? webp : p;
}

/** Aplica resolveImage a arrays (útil para p.images) */
export function resolveImages(arr?: string[] | null) {
  return (arr ?? []).map(resolveImage);
}
