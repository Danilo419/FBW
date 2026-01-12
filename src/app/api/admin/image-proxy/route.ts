// src/app/api/admin/image-proxy/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !isHttpUrl(url)) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  // proteção básica contra abuse
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        // alguns CDNs/hosts servem melhor com UA
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 });
    }

    // Nota: para imagens grandes, isto carrega em memória.
    // Para admin normalmente é ok; se quiseres, eu adapto para stream.
    const buf = await res.arrayBuffer();

    const out = new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        // CORS (aqui é opcional porque já é same-origin, mas não faz mal)
        "Access-Control-Allow-Origin": "*",
      },
    });

    return out;
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
