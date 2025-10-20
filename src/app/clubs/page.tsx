// src/app/clubs/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ClubsClient from "./ClubsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClubCard = { name: string; image?: string | null };

export default async function ClubsPage() {
  const rows = await prisma.product.findMany({
    select: { team: true, images: true },
    orderBy: { team: "asc" },
  });

  const map = new Map<string, string | null>();
  for (const r of rows) {
    const team = (r.team || "").trim();
    if (!team) continue; // evita vazios
    if (!map.has(team)) {
      const imgArr = Array.isArray(r.images) ? r.images : [];
      const firstImg =
        imgArr.find((s) => typeof s === "string" && s.trim().length > 0) ?? null;
      map.set(team, firstImg);
    }
  }

  const clubs: ClubCard[] = Array.from(map.entries())
    .map(([name, image]) => ({ name, image }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="container-fw py-10 space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>
      <Suspense fallback={<div className="rounded-2xl border bg-white p-5 text-center">Loading clubs…</div>}>
        <ClubsClient initialClubs={clubs} />
      </Suspense>
    </main>
  );
}
