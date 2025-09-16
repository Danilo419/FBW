// src/app/api/public-stats/broadcast/route.ts
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

/**
 * Endpoint para “empurrar” updates manuais/automáticos.
 * Body: { metric: string, value: number }
 * Emite no canal "stats" o evento "metric:update".
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const metric = String(body?.metric ?? "");
    const value = Number(body?.value ?? NaN);

    if (!metric || Number.isNaN(value)) {
      return NextResponse.json(
        { ok: false, error: "metric ou value inválidos" },
        { status: 400 }
      );
    }

    await pusherServer.trigger("stats", "metric:update", { metric, value });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Broadcast error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
