import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  await prisma.newsletterSubscriber.updateMany({
    where: { unsubToken: token, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });

  // podes trocar isto por uma página bonita se quiseres
  return NextResponse.json({ ok: true, message: "Unsubscribed" });
}
