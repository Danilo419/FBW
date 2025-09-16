'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { leagueClubs, type LeagueKey, clubImg } from '../products/page';

export default function ClubsPage() {
  const searchParams = useSearchParams();
  const league = searchParams.get('league') as LeagueKey | null;

  if (!league) {
    return <div className="p-10 text-center text-xl">Escolhe uma liga primeiro.</div>;
  }

  const clubs = leagueClubs[league];
  if (!clubs) {
    return <div className="p-10 text-center text-xl">Liga não encontrada.</div>;
  }

  const title = league.replace(/-/g, ' ').toUpperCase();

  return (
    <div className="container-fw py-16">
      <h1 className="text-3xl font-extrabold mb-12 text-center">{title}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {clubs.map((club: string) => (
          <motion.div key={club} whileHover={{ y: -6 }} className="group product-hover">
            {/* AGORA apontamos para /products/team/[club] */}
            <Link href={`/products/team/${encodeURIComponent(club)}`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow ring-1 ring-black/5 bg-white">
                <img
                  src={clubImg(league, club)}
                  alt={club}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-2 text-center">
                <h3 className="font-semibold text-sm capitalize">
                  {club.replace(/-/g, ' ')}
                </h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
