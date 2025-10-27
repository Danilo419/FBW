// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Hash simples e estável para gerar uma versão a partir do URL da imagem */
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  // garantir número positivo
  return Math.abs(h);
}

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/account/login",
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

        // 1) tenta email; 2) se não for email, tenta name (case-insensitive)
        let user: any = null;
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
          id: user.id as string,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    /** Enriquecer o token com dados FRESCOS da DB em cada request */
    async jwt({ token, user }) {
      const userId = (user as any)?.id ?? token.sub;
      if (!userId) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          image: true, // ⚠️ apenas campos válidos do modelo padrão
        },
      });

      if (!dbUser) return token;

      token.name = dbUser.name ?? token.name;
      token.email = dbUser.email ?? token.email;

      // campo standard "picture" no token
      (token as any).picture = dbUser.image ?? null;

      // tua lógica de admin (sem campo isAdmin na DB)
      (token as any).isAdmin = (dbUser.name ?? "").toLowerCase() === "admin";

      // versão estável derivada do URL da imagem para cache-busting
      const pic = dbUser.image ?? "";
      (token as any).ver = pic ? hashStr(pic) : 0;

      return token;
    },

    /** Construir sessão com a imagem + query ?v= para evitar cache antiga no Header */
    async session({ session, token }) {
      if (token?.sub) (session.user as any).id = token.sub;
      (session.user as any).isAdmin = (token as any).isAdmin === true;

      session.user.name = token.name ?? session.user.name ?? null;
      session.user.email = token.email ?? session.user.email ?? null;

      const picture = (token as any).picture ?? null;
      const ver = (token as any).ver ?? 0;

      (session.user as any).image = picture
        ? `${picture}${String(picture).includes("?") ? "&" : "?"}v=${ver}`
        : null;

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
