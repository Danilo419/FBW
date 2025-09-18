// src/app/api/account/register/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(2).max(40),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { name, email, password } = Body.parse(json);

    // 1) Nome já existe? (case-insensitive)
    const existingByName = await prisma.user.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingByName) {
      return NextResponse.json(
        {
          code: "USERNAME_TAKEN",
          message: "A user with this name already exists. Please choose another name.",
        },
        { status: 409 }
      );
    }

    // 2) Email já existe?
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingByEmail) {
      return NextResponse.json(
        { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 3) Criar utilizador
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, passwordHash },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid data.", issues: err.issues },
        { status: 400 }
      );
    }
    console.error("register error", err);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}
