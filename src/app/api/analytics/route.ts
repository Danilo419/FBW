// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // lê JSON do beacon
  const body = await req.json().catch(() => ({} as any));
  const path = String(body?.path ?? "");
  const ref = String(body?.referrer ?? "");
  const ua = req.headers.get("user-agent") || undefined;

  // cookie anónimo do visitante
  let vid = req.cookies.get("vid")?.value;
  if (!vid) {
    vid = crypto.randomUUID();
  }

  if (path) {
    try {
      await prisma.visit.create({
        data: {
          visitorId: vid,
          path,
          referrer: ref || undefined,
          ua,
        },
      });
    } catch (e) {
      // não falha a navegação por causa de analytics
      console.error("[analytics] create failed:", e);
    }
  }

  const res = NextResponse.json({ ok: true });
  // grava/renova cookie 1 ano
  res.cookies.set({
    name: "vid",
    value: vid,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
