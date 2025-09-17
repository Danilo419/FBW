// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        // devolve só os campos necessários
        return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Quando faz login, "user" vem preenchido
      if (user) {
        const name = (user.name ?? "").toLowerCase();
        (token as any).isAdmin = name === "admin";
      }
      return token;
    },
    async session({ session, token }) {
      // expõe isAdmin na sessão
      (session.user as any).isAdmin = (token as any).isAdmin === true;
      // id (sub) útil no client
      if (token.sub) (session.user as any).id = token.sub;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
