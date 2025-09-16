// src/app/api/realtime/route.ts
import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Rápido “health check” para não dar 404 em GET
export function GET() {
  return NextResponse.json({ ok: true, route: "realtime" });
}

export async function POST(req: Request) {
  try {
    const { channel, event, data } = await req.json();
    if (!channel || !event) {
      return NextResponse.json(
        { ok: false, error: "Missing channel or event" },
        { status: 400 }
      );
    }
    await pusher.trigger(channel, event, data ?? {});
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Realtime error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
