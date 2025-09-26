// src/lib/origin.ts
import { headers } from "next/headers";

/** Devolve o base URL da app em qualquer ambiente (async no Next 15). */
export async function getServerBaseUrl(): Promise<string> {
  // 1) Preferir env/VERCEL_URL se existir
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // 2) Derivar dos headers do pedido (agora é async)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
