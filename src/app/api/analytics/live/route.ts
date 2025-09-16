// src/app/api/analytics/live/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const last5 = new Date(Date.now() - 5 * 60 * 1000);
    const uniq = await prisma.visit.findMany({
      where: { createdAt: { gte: last5 } },
      select: { visitorId: true },
      distinct: ["visitorId"],
    });
    return NextResponse.json({ live: uniq.length });
  } catch {
    return NextResponse.json({ live: 0 });
  }
}
