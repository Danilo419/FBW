// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // --- lê body JSON ou form-url-encoded ---
  let password = "";
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const body = await req.json();
      password = String(body?.password ?? "");
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      password = String(form.get("password") ?? "");
    } else {
      // fallback: tenta json e depois form
      const body = await req.json().catch(() => ({} as any));
      if (body && body.password != null) {
        password = String(body.password);
      } else {
        const form = await req.formData().catch(() => null);
        if (form) password = String(form.get("password") ?? "");
      }
    }
  } catch {
    // ignora: password fica vazia
  }

  const envRaw = process.env.ADMIN_PASSWORD ?? "";
  if (!envRaw) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured on server" },
      { status: 500 }
    );
  }

  // --- normalização forte para evitar BOM/CR/LF/espaços e composição Unicode ---
  const norm = (s: string) =>
    s
      .replace(/\uFEFF/g, "") // BOM
      .replace(/\r/g, "")     // CR (Windows)
      .replace(/\n/g, "")     // LF
      .trim()
      .normalize("NFKC");     // normaliza Unicode

  const input = norm(password);
  const secret = norm(envRaw);

  // DEBUG opcional (não revela a password)
  if (process.env.ADMIN_DEBUG === "1") {
    console.log("[ADMIN_LOGIN] input.len:", input.length, "env.len:", secret.length);
    console.log(
      "[ADMIN_LOGIN] firstCharCodes",
      input.charCodeAt(0),
      secret.charCodeAt(0)
    );
  }

  const ok = timingSafeEqual(input, secret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "admin_auth",
    value: "ok",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  });
  return res;
}

function timingSafeEqual(a: string, b: string) {
  const ta = new TextEncoder().encode(a);
  const tb = new TextEncoder().encode(b);
  if (ta.length !== tb.length) return false;
  let diff = 0;
  for (let i = 0; i < ta.length; i++) diff |= ta[i] ^ tb[i];
  return diff === 0;
}
