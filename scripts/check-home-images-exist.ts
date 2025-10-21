// scripts/check-home-images-exist.ts
import fs from "fs"; import path from "path";
const FILE = path.join(process.cwd(), "src", "app", "HomeClient.tsx");
const PUBLIC = path.join(process.cwd(), "public");
const src = fs.readFileSync(FILE, "utf8");
const re = /['"`](\/images\/[^'"`]+?\.(?:png|jpg|jpeg))['"`]/gi;
const missing = new Set<string>();
const matches = src.matchAll(re);
for (const m of matches) {
  const rel = m[1]; const abs = path.join(PUBLIC, rel);
  if (!fs.existsSync(abs)) missing.add(rel);
}
console.log(missing.size ? "FALTAM:\n" + [...missing].join("\n") : "Tudo OK");
