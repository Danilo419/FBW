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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 });
    }

    const buf = await res.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
