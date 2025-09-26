// src/lib/origin.ts
import { headers } from "next/headers";

/** Base URL correto em qualquer ambiente (Next 15: async). */
export async function getServerBaseUrl(): Promise<string> {
  // 1) Se tiver env/VERCEL_URL, usa
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // 2) Caso contrário, deriva do pedido atual
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
