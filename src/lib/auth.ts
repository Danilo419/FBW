// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

/** Evitar guardar/propagar data URLs pesadas */
function isDataUrl(url?: string | null) {
  return !!url && url.startsWith("data:");
}

/** Tenta diferentes nomes de campo de hash */
function getPasswordHash(user: any): string | null {
  return (
    user?.passwordHash ??
    user?.hashedPassword ??
    user?.password ??
    null
  );
}

export const authOptions: NextAuthOptions = {
  // Adapter necessário para events e contas OAuth
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" }, // mantém alinhado com as tuas rotas

  providers: [
    // Google OAuth (opcional)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    // Credentials: aceita "identifier" (nome OU email) + password
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Name or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const identifier = creds?.identifier?.toString().trim() ?? "";
        const password = creds?.password?.toString() ?? "";
        if (!identifier || !password) return null;

        const byEmail = identifier.includes("@");
        const user =
          (byEmail
            ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
            : await prisma.user.findUnique({ where: { name: identifier } })) || null;

        if (!user) return null;

        const hash = getPasswordHash(user);
        if (!hash) return null;

        const ok = await bcrypt.compare(password, String(hash));
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          image: isDataUrl(user.image) ? null : user.image ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    /** Guarda info essencial no token para a sessão ter sempre id/email */
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id ?? token.sub;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        (token as any).picture = (user as any).image ?? (token as any).picture;
      }
      return token;
    },

    /** Garante que session.user tem sempre id/email; evita loops no /account */
    async session({ session, token }) {
      if (!session.user) session.user = {} as any;

      (session.user as any).id = (token.sub as string) || (session.user as any).id;
      if (!session.user.email && (token as any).email) {
        session.user.email = (token as any).email as string;
      }
      if (!session.user.name && (token as any).name) {
        session.user.name = (token as any).name as string;
      }
      if (!session.user.image && (token as any).picture) {
        const pic = (token as any).picture as string;
        session.user.image = isDataUrl(pic) ? null : pic;
      }

      // Fallback: se ainda faltarem dados, tenta carregar da BD pelo id
      if (!(session.user as any).id || !session.user.email) {
        const uid = (token.sub as string) || null;
        if (uid) {
          const db = await prisma.user.findUnique({
            where: { id: uid },
            select: { id: true, name: true, email: true, image: true },
          });
          if (db) {
            (session.user as any).id = db.id;
            session.user.name ??= db.name ?? undefined;
            session.user.email ??= db.email ?? undefined;
            if (!session.user.image && db.image) {
              session.user.image = isDataUrl(db.image) ? null : db.image;
            }
          }
        }
      }

      return session;
    },

    /** Permite redirects relativos e do mesmo domínio */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },

  /** Eventos (usados para atualizar métricas em tempo real) */
  events: {
    async createUser({ user }) {
      try {
        await pusherServer.trigger("stats", "metric:update", {
          metric: "community",
          value: 1,
          userId: user.id,
        });
      } catch (e) {
        console.error("Pusher community trigger failed:", e);
      }
    },
  },
};
