// scripts/optimize-images.ts
import sharp from "sharp";
import { glob } from "glob";
import { promises as fs } from "fs";
import path from "path";

const RULES: { dir: string; maxW: number; quality: number }[] = [
  { dir: "public/assets",  maxW: 512,  quality: 80 },   // logos de clubes
  { dir: "public/images",  maxW: 1200, quality: 78 },   // fotos de produto/backgrounds
  { dir: "public/img",     maxW: 1200, quality: 78 },
];

const exts = ["png","jpg","jpeg","webp"];

async function optimizeFile(src: string, maxW: number, quality: number) {
  const out = src.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  const img = sharp(src).rotate();
  const meta = await img.metadata();
  const width = meta.width || maxW;

  const pipeline = img.resize({ width: Math.min(width, maxW) }).webp({ quality });
  const buf = await pipeline.toBuffer();

  // só substitui se ganhar >10% de espaço
  try {
    const orig = await fs.stat(src);
    if (buf.length < orig.size * 0.9) {
      await fs.writeFile(out, buf);
      await fs.unlink(src).catch(() => {});
      console.log(`✔ ${path.basename(src)} → ${path.basename(out)}  (${(orig.size/1e6).toFixed(2)}MB → ${(buf.length/1e6).toFixed(2)}MB)`);
    } else {
      // mantém extensão, só regrava otimizado
      await fs.writeFile(src, buf);
      console.log(`≈ ${path.basename(src)} optimized in-place`);
    }
  } catch {
    await fs.writeFile(out, buf);
  }
}

(async () => {
  for (const { dir, maxW, quality } of RULES) {
    const files = await glob(`${dir}/**/*.{${exts.join(",")}}`, { nocase: true });
    for (const f of files) {
      try { await optimizeFile(f, maxW, quality); }
      catch (e) { console.warn("Skip", f, e); }
    }
  }
})();
