// src/components/nations/NationsClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

type NationCard = {
  name: string; // "Portugal"
  image?: string | null; // se quiseres passar imagem real futuramente
};

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function flagEmojiFromName(name: string) {
  // Mapa simples (podes expandir)
  const map: Record<string, string> = {
    Portugal: "🇵🇹",
    Spain: "🇪🇸",
    France: "🇫🇷",
    England: "🏴",
    Germany: "🇩🇪",
    Italy: "🇮🇹",
    Netherlands: "🇳🇱",
    Belgium: "🇧🇪",
    Croatia: "🇭🇷",
    Switzerland: "🇨🇭",
    Denmark: "🇩🇰",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Poland: "🇵🇱",
    Austria: "🇦🇹",
    Turkey: "🇹🇷",
    Ukraine: "🇺🇦",
    Serbia: "🇷🇸",
    Romania: "🇷🇴",
    Greece: "🇬🇷",
    Ireland: "🇮🇪",

    Brazil: "🇧🇷",
    Argentina: "🇦🇷",
    Uruguay: "🇺🇾",
    Colombia: "🇨🇴",
    Chile: "🇨🇱",

    Mexico: "🇲🇽",
    USA: "🇺🇸",
    Canada: "🇨🇦",

    Japan: "🇯🇵",
    "South Korea": "🇰🇷",
    Morocco: "🇲🇦",
    Nigeria: "🇳🇬",
    Senegal: "🇸🇳",
    Egypt: "🇪🇬",
  };

  return map[name] || "🌍";
}

function makePosterSvgDataUri(seed: string, flag: string, title: string) {
  // poster em SVG (fica "imagem" igual ao Clubs, sem assets)
  const s = seed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hue =
    (s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 11) % 360;

  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue}, 86%, 58%)"/>
        <stop offset="0.55" stop-color="hsl(${(hue + 25) % 360}, 86%, 48%)"/>
        <stop offset="1" stop-color="hsl(${(hue + 55) % 360}, 86%, 40%)"/>
      </linearGradient>

      <pattern id="lines" width="90" height="90" patternUnits="userSpaceOnUse">
        <path d="M0,90 L90,0" stroke="rgba(255,255,255,0.18)" stroke-width="10"/>
        <path d="M-45,90 L45,0" stroke="rgba(255,255,255,0.10)" stroke-width="8"/>
        <path d="M45,90 L135,0" stroke="rgba(255,255,255,0.10)" stroke-width="8"/>
      </pattern>

      <radialGradient id="shine" cx="35%" cy="30%" r="80%">
        <stop offset="0" stop-color="rgba(255,255,255,0.35)"/>
        <stop offset="1" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>

      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>

    <rect width="900" height="1125" fill="url(#bg)"/>
    <rect width="900" height="1125" fill="url(#lines)" opacity="0.95"/>
    <rect width="900" height="1125" fill="url(#shine)"/>

    <circle cx="720" cy="240" r="220" fill="rgba(0,0,0,0.12)"/>
    <circle cx="200" cy="980" r="270" fill="rgba(0,0,0,0.10)"/>

    <!-- center badge -->
    <g filter="url(#shadow)">
      <circle cx="450" cy="500" r="220" fill="rgba(255,255,255,0.16)"/>
      <circle cx="450" cy="500" r="220" fill="rgba(0,0,0,0.06)"/>
    </g>

    <text x="450" y="560" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="170"
      fill="rgba(255,255,255,0.95)"
      style="filter: drop-shadow(0 10px 18px rgba(0,0,0,0.35));"
    >${flag}</text>

    <!-- subtle title at bottom (like a poster) -->
    <text x="450" y="1025" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="44"
      font-weight="800"
      letter-spacing="2"
      fill="rgba(255,255,255,0.85)"
    >${safeTitle.toUpperCase()}</text>
  </svg>`;

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  return `data:image/svg+xml,${encoded}`;
}

const DEFAULT_NATIONS: NationCard[] = [
  { name: "Portugal" },
  { name: "Spain" },
  { name: "France" },
  { name: "England" },
  { name: "Germany" },

  { name: "Italy" },
  { name: "Netherlands" },
  { name: "Belgium" },
  { name: "Croatia" },
  { name: "Switzerland" },

  { name: "Brazil" },
  { name: "Argentina" },
  { name: "Uruguay" },
  { name: "Colombia" },
  { name: "Chile" },

  { name: "USA" },
  { name: "Mexico" },
  { name: "Canada" },

  { name: "Japan" },
  { name: "South Korea" },

  { name: "Morocco" },
  { name: "Nigeria" },
  { name: "Senegal" },
  { name: "Egypt" },
];

export default function NationsClient({
  initialNations = DEFAULT_NATIONS as NationCard[],
}: {
  initialNations?: NationCard[];
}) {
  const nations = Array.from(new Map(initialNations.map((n) => [n.name, n]))).map(
    ([, v]) => v
  );

  if (!nations.length) {
    return <div className="p-10 text-center text-xl">No nations found.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {nations.map(({ name, image }) => {
        const slug = slugify(name);
        const display = name.replace(/-/g, " ");
        const flag = flagEmojiFromName(name);

        // se tiveres imagem real para algumas seleções, passa em initialNations
        const img = image || makePosterSvgDataUri(name, flag, display);

        return (
          <motion.div
            key={slug}
            whileHover={{ y: -6 }}
            className="group product-hover"
          >
            <Link href={`/nations/${slug}`} aria-label={`Open ${display}`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border bg-white">
                <Image
                  src={img}
                  alt={display}
                  fill
                  className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width:1024px) 220px, 45vw"
                  unoptimized
                />

                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white/90 to-transparent">
                  <span className="block text-center text-sm font-semibold capitalize line-clamp-1">
                    {display}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
