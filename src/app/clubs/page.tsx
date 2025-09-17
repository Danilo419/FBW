// src/app/clubs/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ClubsClient from "./ClubsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClubsPage() {
  // Load unique team names on the server
  const rows = await prisma.product.findMany({
    select: { team: true },
    distinct: ["team"],
    take: 500, // safety cap
  });

  const teams = Array.from(
    new Set(rows.map((r) => (r.team || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="container-fw py-10 space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading clubs…
          </div>
        }
      >
        <ClubsClient initialTeams={teams} />
      </Suspense>
    </main>
  );
}
