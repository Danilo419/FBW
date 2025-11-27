// src/app/products/ProductsClient.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { clubImg, leaguesOrder, type LeagueKey } from "@/lib/shop-data";

/* ---------------- Players (UI showcase) ---------------- */
const players = [
  { id: "cristiano-ronaldo", name: "Cristiano Ronaldo", img: "/assets/players/cristiano.png" },
  { id: "lionel-messi", name: "Lionel Messi", img: "/assets/players/messi.png" },
  { id: "neymar-jr", name: "Neymar Jr", img: "/assets/players/neymar.png" },
  { id: "kylian-mbappe", name: "Kylian Mbappé", img: "/assets/players/mbappe.png" },
  { id: "erling-haaland", name: "Erling Haaland", img: "/assets/players/haaland.png" },

  { id: "kevin-de-bruyne", name: "Kevin De Bruyne", img: "/assets/players/kevin-de-bruyne.png" },
  { id: "vinicius-jr", name: "Vinícius Jr", img: "/assets/players/vinicius-jr.png" },
  { id: "luka-modric", name: "Luka Modrić", img: "/assets/players/modric.png" },
  { id: "mohamed-salah", name: "Mohamed Salah", img: "/assets/players/salah.png" },
  { id: "jude-bellingham", name: "Jude Bellingham", img: "/assets/players/bellingham.png" },
  { id: "robert-lewandowski", name: "Robert Lewandowski", img: "/assets/players/lewandowski.png" },
  { id: "antoine-griezmann", name: "Antoine Griezmann", img: "/assets/players/griezmann.png" },
  { id: "harry-kane", name: "Harry Kane", img: "/assets/players/kane.png" },
  { id: "bruno-fernandes", name: "Bruno Fernandes", img: "/assets/players/bruno-fernandes.png" },
  { id: "joao-felix", name: "João Félix", img: "/assets/players/felix.png" },
];

/* ---------------- Featured clubs (usar slugs!) ---------------- */
const featuredClubs: { league: LeagueKey; club: string; name: string }[] = [
  { league: "la-liga",        club: "real-madrid",      name: "Real Madrid" },
  { league: "premier-league", club: "manchester-city",  name: "Manchester City" },
  { league: "bundesliga",     club: "bayern-munich",    name: "Bayern Munich" },
  { league: "ligue-1",        club: "psg",              name: "Paris Saint-Germain" },
  { league: "serie-a",        club: "inter",            name: "Inter" },
];

export default function ProductsClient() {
  const first5Players = players.slice(0, 5);

  return (
    <div className="container-fw py-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-12 text-center">
        Browse Products
      </h1>

      {/* Players */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold">By Players</h2>
          <a
            href="/players"
            className="hidden sm:inline-block px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            See more players
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {first5Players.map((p) => (
            <motion.a
              key={p.id}
              href={`/players/${p.id}`}
              whileHover={{ y: -6 }}
              className="group product-hover"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 bg-white">
                <img
                  src={p.img}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute bottom-2 left-2 right-2"
                >
                  <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                    View jerseys
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>
              </div>
              <div className="p-2 text-center">
                <h3 className="font-semibold text-sm">{p.name}</h3>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="sm:hidden text-center mt-6">
          <a
            href="/players"
            className="inline-block px-6 py-2 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            See more players
          </a>
        </div>
      </section>

      {/* Featured clubs -> /products/team/[club] */}
      <section className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold">By Clubs</h2>
          <a
            href="/clubs"
            className="hidden sm:inline-block px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            See more clubs
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {featuredClubs.map(({ league, club, name }) => (
            <motion.div key={`${league}:${club}`} whileHover={{ y: -6 }} className="group product-hover">
              <Link href={`/products/team/${club}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 bg-white">
                  <img
                    src={clubImg(league, club)} // ✅ usa a versão normalizada da lib
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                      View jerseys
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="p-2 text-center">
                  <h3 className="font-semibold text-sm">{name}</h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="sm:hidden text-center mt-6">
          <a
            href="/clubs"
            className="inline-block px-6 py-2 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            See more clubs
          </a>
        </div>
      </section>

      {/* Browse by League */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Browse by League</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {leaguesOrder.map((lg) => (
            <motion.a
              key={lg.key}
              href={`/leagues/${encodeURIComponent(lg.key)}`}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 bg-white">
                <img
                  src={lg.img}
                  alt={lg.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="p-2 text-center">
                <h3 className="font-semibold text-sm">{lg.name}</h3>
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </div>
  );
}
