// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  let token = "";
  let password = "";

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    token = parsed.data.token;
    password = parsed.data.password;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { email: record.email },
      data: { passwordHash: hashed },
    });

    await tx.passwordResetToken.delete({ where: { token } });
  });

  return NextResponse.json({ ok: true });
}
