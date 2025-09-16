import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Buscar o utilizador com o hash atual
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, passwordHash: true },
    });

    // Conta criada por OAuth e sem password local
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "This account has no local password set." },
        { status: 400 }
      );
    }

    // Validar password atual
    const matches = await bcrypt.compare(
      String(currentPassword ?? ""),
      user.passwordHash
    );
    if (!matches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Gerar novo hash e gravar
    const hash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("password.patch", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
