// src/app/account/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AccountClient from "./AccountClient";

const fallbackImg =
  "https://api.dicebear.com/7.x/initials/svg?radius=50&backgroundType=gradientLinear&seed=FW";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  // Sem sessão nenhuma → ir para login
  if (!session) {
    redirect("/login?next=/account");
  }

  const email = session.user?.email ?? null;
  const name = session.user?.name ?? null;

  // Tenta carregar o utilizador por email; se não houver, tenta por name (se for único)
  let dbUser =
    (email &&
      (await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      }))) ||
    (name &&
      (await prisma.user.findUnique({
        where: { name },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      }))) ||
    null;

  // Se mesmo autenticado não encontrarmos registo, evita loop: mostra aviso em vez de redirect
  if (!dbUser) {
    return (
      <div className="container-fw py-16 space-y-4">
        <h1 className="text-3xl font-extrabold">My account</h1>
        <p className="text-gray-700">
          We couldn't load your profile record. This sometimes happens if you signed in with a username
          and your email isn't attached to the session.
        </p>
        <p className="text-gray-600">
          Try logging out and in again using your <b>email</b>. If the problem persists, contact support.
        </p>
      </div>
    );
  }

  // Provider OAuth (se existir)
  const oauth = await prisma.account.findFirst({
    where: { userId: dbUser.id },
    select: { provider: true },
  });
  const provider = oauth?.provider
    ? oauth.provider.charAt(0).toUpperCase() + oauth.provider.slice(1)
    : "Credentials";

  return (
    <div className="container-fw py-16 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">My account</h1>
        <br>
        <p className="text-gray-600">
          Manage your profile, security and personal info.
        </p>
        </br>
      </div>

      <AccountClient
        userId={dbUser.id}
        email={dbUser.email ?? ""}
        defaultName={dbUser.name ?? ""}
        defaultImage={dbUser.image ?? undefined}
        createdAt={dbUser.createdAt.toISOString()}
        updatedAt={dbUser.updatedAt.toISOString()}
        provider={provider}
        fallbackImage={fallbackImg}
      />
    </div>
  );
}
