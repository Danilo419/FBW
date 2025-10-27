import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  return v.startsWith("/") && !v.startsWith("//");
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawName: unknown = body?.name;
  const rawImage: unknown = body?.image;

  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim().slice(0, 120)
      : null;

  let image: string | null = null;
  if (typeof rawImage === "string") {
    const val = rawImage.trim();

    if (val.length === 0) {
      image = null;
    } else if (isDataUrl(val)) {
      return NextResponse.json(
        { error: "Data URLs are not allowed. Provide an http(s) URL." },
        { status: 400 }
      );
    } else if (isHttpUrl(val) || isRelativePath(val)) {
      // corta URL se for gigante
      image = val.slice(0, 1024);
    } else {
      return NextResponse.json(
        { error: "Invalid image URL. Use http(s) or a relative path (/...)."},
        { status: 400 }
      );
    }
  } else if (rawImage === null) {
    image = null;
  }

  try {
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name, image },
      select: { id: true, name: true, email: true, image: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    console.error("profile.patch error:", e);
    return NextResponse.json({ error: e?.message ?? "Database error" }, { status: 500 });
  }
}
