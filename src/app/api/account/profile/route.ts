// src/app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Regras de validação para imagem */
function isDataUrl(v: string) {
  return v.startsWith("data:");
}
function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function isRelativePath(v: string) {
  // permite caminhos tipo /uploads/xyz.jpg (sem query muito grande)
  return v.startsWith("/") && !v.startsWith("//");
}

export async function PATCH(req: Request) {
  // 1) Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Body (JSON)
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawName: unknown = body?.name;
  const rawImage: unknown = body?.image;

  // Normalização de nome
  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim().slice(0, 120) // limite defensivo
      : null;

  // Normalização/validação de imagem
  let image: string | null = null;
  if (typeof rawImage === "string") {
    const val = rawImage.trim();

    if (val.length === 0) {
      image = null; // limpar imagem
    } else if (isDataUrl(val)) {
      // BLOQUEIA data URL/base64
      return NextResponse.json(
        {
          error:
            "Data URLs are not allowed. Please provide an HTTP(S) URL or an uploaded file path.",
        },
        { status: 400 }
      );
    } else if (isHttpUrl(val) || isRelativePath(val)) {
      // aceita http/https ou caminho relativo
      image = val.slice(0, 1024); // limite defensivo
    } else {
      return NextResponse.json(
        { error: "Invalid image URL. Use http(s) or a relative path (/uploads/...)." },
        { status: 400 }
      );
    }
  } else if (rawImage === null) {
    image = null; // permitir limpar explicitamente
  }

  // 3) Update
  try {
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        // permite limpar (null) ou atualizar; se quiser não tocar, envie undefined aqui
        name,
        image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    console.error("profile.patch error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Database error" },
      { status: 500 }
    );
  }
}
