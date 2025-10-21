// src/app/clubs/ClubsClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { clubImagePath } from "../../lib/clubs"; // <-- import relativo

type Club = { name: string; slug: string };

export default function ClubsClient({ clubs }: { clubs: Club[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clubs;
    return clubs.filter((c) => c.name.toLowerCase().includes(term));
  }, [q, clubs]);

  return (
    <>
      <div className="mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clubs…"
          className="w-full md:w-96 rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-black/10"
          aria-label="Search clubs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((club) => {
          const img = clubImagePath(club.slug);
          const href = `/products?team=${encodeURIComponent(club.name)}`;

          return (
            <Link
              key={club.slug}
              href={href}
              className="group rounded-2xl border bg-white hover:shadow-md transition overflow-hidden"
            >
              <div className="aspect-[4/3] w-full relative bg-neutral-50">
                <Image
                  src={img}
                  alt={club.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-6 transition group-hover:scale-[1.02]"
                />
              </div>
              <div className="px-4 py-3 border-t">
                <div className="font-medium">{club.name}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-500 mt-6">
          No clubs found for “{q}”.
        </p>
      )}
    </>
  );
}
