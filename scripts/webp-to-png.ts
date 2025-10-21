// scripts/webp-to-png.ts
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public");
function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

(async () => {
  let n = 0;
  for (const abs of walk(ROOT)) {
    if (!abs.toLowerCase().endsWith(".webp")) continue;
    const rel = abs.slice(ROOT.length).replace(/\\/g, "/");
    const pngRel = rel.replace(/\.webp$/i, ".png");
    const pngAbs = path.join(ROOT, pngRel);
    fs.mkdirSync(path.dirname(pngAbs), { recursive: true });
    await sharp(abs).png({ quality: 92 }).toFile(pngAbs);
    console.log("CREATED", pngRel);
    n++;
  }
  console.log(`Done: ${n} files.`);
})();
