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

/** Tenta diferentes nomes de campo de hash (compat) */
function getPasswordHash(user: any): string | null {
  return user?.passwordHash ?? user?.hashedPassword ?? user?.password ?? null;
}

export const authOptions: NextAuthOptions = {
  // Adapter necessário para events e contas OAuth
  adapter: PrismaAdapter(prisma),

  // JWT para evitar leituras/escritas de sessão em DB
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    // updateAge é irrelevante para JWT, mas deixo explícito
    updateAge: 0,
  },

  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },

  providers: [
    // OAuth (opcional)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    // Credentials
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
            ? await prisma.user.findUnique({
                where: { email: identifier.toLowerCase() },
              })
            : await prisma.user.findUnique({
                where: { name: identifier },
              })) || null;

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
    /** Coloca info no token quando se autentica (ou quando o token é criado) */
    async jwt({ token, user }) {
      // Quando é login/refresh inicial há "user"; guardamos no token
      if (user) {
        token.sub = (user as any).id ?? token.sub;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        (token as any).picture =
          (user as any).image ?? (token as any).picture ?? null;
      }
      return token;
    },

    /**
     * Sessão enviada ao cliente. Aqui garantimos que a sessão
     * reflete SEMPRE os dados mais recentes da BD (especialmente "image").
     */
    async session({ session, token }) {
      if (!session.user) session.user = {} as any;

      // Base: copiar do token (rápido)
      (session.user as any).id =
        (token.sub as string) || (session.user as any).id;
      session.user.email ||= (token as any).email as string | undefined;
      session.user.name ||= (token as any).name as string | undefined;

      const pictureFromToken = (token as any).picture as string | null | undefined;
      if (!session.user.image && pictureFromToken) {
        session.user.image = isDataUrl(pictureFromToken)
          ? null
          : pictureFromToken;
      }

      // 🔁 Fonte de verdade: BD
      // Fazemos SEMPRE uma leitura leve (id/name/email/image) para apanhar alterações (ex.: avatar trocado)
      const uid = (token.sub as string) || null;
      if (uid) {
        const db = await prisma.user.findUnique({
          where: { id: uid },
          select: { id: true, name: true, email: true, image: true },
        });
        if (db) {
          (session.user as any).id = db.id;
          // Preferimos valores da BD (se existirem)
          session.user.name = db.name ?? session.user.name;
          session.user.email = db.email ?? session.user.email;
          session.user.image = db.image
            ? isDataUrl(db.image)
              ? null
              : db.image
            : session.user.image ?? null;
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
      } catch {
        /* noop */
      }
      return baseUrl;
    },
  },

  /** Eventos (métricas em tempo real, etc.) */
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

    // (Opcional) Quando o utilizador é atualizado (ex.: através do Prisma/NextAuth),
    // poderias também enviar um evento. Não é necessário para o Header refletir a imagem.
    // async updateUser({ user }) { ... }
  },
};
