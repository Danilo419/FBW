// src/app/api/auth/health/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json({
    requestHost: url.host,
    env: process.env.VERCEL_ENV ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? null,
    NEXTAUTH_SECRET_present: Boolean(process.env.NEXTAUTH_SECRET),
    VERCEL_URL: process.env.VERCEL_URL ?? null
  });
}
