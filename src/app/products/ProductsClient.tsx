"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { players, featuredClubs, leaguesOrder, clubImg } from "./data";

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

      {/* Clubs destaque → /products/team/[club] */}
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
            <motion.div
              key={`${league}:${club}`}
              whileHover={{ y: -6 }}
              className="group product-hover"
            >
              <Link href={`/products/team/${encodeURIComponent(club)}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 bg-white">
                  <img
                    src={clubImg(league, club)}
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
              href={`/clubs?league=${encodeURIComponent(lg.key)}`}
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
