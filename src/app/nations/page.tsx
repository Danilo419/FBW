// src/app/nations/page.tsx
import { prisma } from "@/lib/prisma";
import NationsClient from "@/components/nations/NationsClient";

/** Sempre runtime (sem cache/ISR) */
export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Nations | FootballWorld",
  description: "Browse all nations with FootballWorld products available.",
};

function titleFromTeam(team?: string | null) {
  const t = (team ?? "").trim();
  if (!t) return "";
  // mantém o estilo do teu projeto (simples e seguro)
  return t.replace(/\s+/g, " ");
}

export default async function NationsPage() {
  // ✅ Puxa todos os "teams" distintos existentes nos produtos (APENAS teamType NATION)
  const teams = await prisma.product.findMany({
    where: {
      teamType: "NATION",
    },
    select: { team: true },
    distinct: ["team"],
    orderBy: { team: "asc" },
  });

  const initialNations = teams
    .map((t) => ({ name: titleFromTeam(t.team) }))
    .filter((x) => x.name);

  // Se não houver nada na BD, o NationsClient mostra a lista default (fallback)
  return <NationsClient initialNations={initialNations} />;
}
