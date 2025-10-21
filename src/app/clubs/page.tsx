// src/app/clubs/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import ClubsClient from "./ClubsClient";
import { slugifyClub } from "../../lib/clubs";

type ClubRow = { team: string | null };

async function getDistinctClubs(): Promise<{ name: string; slug: string }[]> {
  const rows: ClubRow[] = await prisma.product.findMany({
    // sem "where" – evita o erro de tipos
    distinct: ["team"],
    select: { team: true },
    orderBy: { team: "asc" },
  });

  const clubs = rows
    .filter((r) => typeof r.team === "string" && r.team.trim().length > 0)
    .map((r) => {
      const name = (r.team as string).trim();
      return { name, slug: slugifyClub(name) };
    });

  const seen = new Set<string>();
  const unique: { name: string; slug: string }[] = [];
  for (const c of clubs) {
    if (!seen.has(c.slug)) {
      seen.add(c.slug);
      unique.push(c);
    }
  }
  return unique;
}

export default async function ClubsPage() {
  const clubs = await getDistinctClubs();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">Clubs</h1>
      <ClubsClient clubs={clubs} />
    </div>
  );
}
