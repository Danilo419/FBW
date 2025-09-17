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
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          if (!user || !user.passwordHash) return null;

          const ok = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!ok) return null;

          return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined };
        } catch {
          // Em credenciais nunca lances erro; devolve null para cair em "CredentialsSignin"
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const name = (user.name ?? "").toLowerCase();
        (token as any).isAdmin = name === "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) (session.user as any).id = token.sub;
      (session.user as any).isAdmin = (token as any).isAdmin === true;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
