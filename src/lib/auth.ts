// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

/** Evitar guardar data URLs pesadas */
function isDataUrl(url?: string | null) {
  return !!url && url.startsWith("data:");
}

export const authOptions: NextAuthOptions = {
  // ✅ Adapter é necessário para o events.createUser
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/account/login" },

  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    // Email + Password (login)
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email?.toString().trim() ?? "";
        const password = creds?.password?.toString() ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
          },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: isDataUrl(user.image) ? null : user.image ?? null,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Opcional: ao fazer OAuth sign-in, podemos atualizar nome/imagem com dados “limpos”.
     * (A criação do user pela 1.ª vez é feita automaticamente pelo PrismaAdapter.)
     */
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: user.name ?? undefined,
            image: isDataUrl(user.image ?? undefined)
              ? undefined
              : (user.image ?? undefined),
          },
        }).catch(() => void 0);
      }
      return true;
    },

    /** JWT minimalista → guardamos só uid */
    async jwt({ token, user }) {
      if (user) {
        (token as any).uid = (user as any).id ?? token.sub ?? (token as any).uid;
      }
      // limpar payload
      delete (token as any).name;
      delete (token as any).email;
      delete (token as any).picture;
      return token;
    },

    /** Sessão com dados fresh da BD */
    async session({ session, token }) {
      const uid = (token as any).uid as string | undefined;
      if (!uid) return session;

      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, name: true, email: true, image: true },
      });

      if (dbUser && session.user) {
        (session.user as any).id = dbUser.id;
        session.user.name = dbUser.name ?? null;
        session.user.email = dbUser.email ?? null;
        session.user.image = isDataUrl(dbUser.image) ? null : dbUser.image ?? null;
      }
      return session;
    },
  },

  /**
   * 🔔 Eventos (funcionam com Adapter):
   * Dispara um evento realtime quando um novo utilizador é criado,
   * para o widget “Community” atualizar sem refresh.
   */
  events: {
    async createUser({ user }) {
      try {
        await pusherServer.trigger("stats", "metric:update", {
          metric: "community",
          value: 1, // incremento visual imediato
          userId: user.id,
        });
      } catch (e) {
        console.error("Pusher community trigger failed:", e);
      }
    },
  },
};
