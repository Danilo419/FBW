// src/app/leagues/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEAGUES_CONFIG } from "@/lib/leaguesConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Usamos "any" para ser sempre compatível com o tipo gerado pelo Next 15
export default async function LeagueDetailPage({ params }: any) {
  const slug: string | undefined = params?.slug;
  if (!slug) {
    return notFound();
  }

  const league = LEAGUES_CONFIG.find((l) => l.slug === slug);
  if (!league || !league.clubs || league.clubs.length === 0) {
    return notFound();
  }

  const teamNames = league.clubs.map((c) => c.teamName);

  // teams desta league que têm pelo menos 1 produto
  const teamsWithProducts = await prisma.product.findMany({
    where: {
      team: {
        in: teamNames,
      },
    },
    select: {
      team: true,
    },
    distinct: ["team"],
  });

  const activeTeamNames = new Set(teamsWithProducts.map((t) => t.team));
  const clubsToShow = league.clubs.filter((c) => activeTeamNames.has(c.teamName));

  if (clubsToShow.length === 0) {
    return notFound();
  }

  return (
    <main className="container-fw py-10">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-gray-100">
          <Image
            src={league.image}
            alt={league.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{league.name}</h1>
          <p className="text-sm text-gray-500">
            Select a club to see all products for that club.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {clubsToShow.map((club) => (
          <Link
            key={club.clubSlug}
            href={`/clubs/${club.clubSlug}`}
            className="group block rounded-3xl bg-white shadow-md hover:shadow-xl transition overflow-hidden border border-gray-100"
          >
            {/* Se tiveres imagens específicas das equipas, troca o src aqui */}
            <div className="relative w-full pt-[135%] bg-gray-50">
              <Image
                src={league.image}
                alt={club.teamName}
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              />
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-sm font-medium group-hover:text-blue-700">
                {club.teamName}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
