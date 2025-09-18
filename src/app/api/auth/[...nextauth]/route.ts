// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/account/signup", // tua página
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Name or Email", type: "text" },
        password:   { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const id = credentials?.identifier?.trim();
        const pw = credentials?.password;
        if (!id || !pw) return null;

        // 1) tenta email; 2) se não for email, tenta por nome (case-insensitive)
        let user = null;
        if (id.includes("@")) {
          user = await prisma.user.findUnique({ where: { email: id } });
        } else {
          user = await prisma.user.findFirst({
            where: { name: { equals: id, mode: "insensitive" } },
          });
        }
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(pw, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).isAdmin = (user.name ?? "").toLowerCase() === "admin";
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) (session.user as any).id = token.sub;
      (session.user as any).isAdmin = (token as any).isAdmin === true;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
