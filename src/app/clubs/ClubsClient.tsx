// src/app/clubs/ClubsClient.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type Props = {
  /** List of club/team names coming from the server page */
  initialTeams?: string[];
};

export default function ClubsClient({ initialTeams = [] }: Props) {
  const teams = Array.from(new Set(initialTeams))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (teams.length === 0) {
    return (
      <div className="p-10 text-center text-xl">
        No clubs found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {teams.map((club) => (
        <motion.div key={club} whileHover={{ y: -6 }} className="group product-hover">
          <Link href={`/products/team/${encodeURIComponent(club)}`}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow ring-1 ring-black/5 bg-white grid place-items-center">
              <span className="px-3 text-center text-sm font-semibold capitalize">
                {club.replace(/-/g, ' ')}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
