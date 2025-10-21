// src/app/clubs/ClubsClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

type ClubCard = { name: string; image?: string | null };

function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ClubsClient({ initialClubs = [] as ClubCard[] }) {
  const clubs = Array.from(
    new Map(initialClubs.map((c) => [c.name, c])) // dedup
  ).map(([, v]) => v);

  if (!clubs.length) {
    return <div className="p-10 text-center text-xl">No clubs found.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {clubs.map(({ name, image }) => {
        const slug = slugify(name);
        const display = name.replace(/-/g, " ");
        const img = image || "/placeholder.png";
        return (
          <motion.div key={name} whileHover={{ y: -6 }} className="group product-hover">
            <Link href={`/clubs/${slug}`} aria-label={`Open ${display}`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border bg-white">
                <Image
                  src={img}
                  alt={display}
                  fill
                  className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width:1024px) 220px, 45vw"
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
