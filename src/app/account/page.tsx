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

  // Sem sessão → redireciona para login preservando o destino
  if (!session?.user?.email) {
    redirect("/login?next=/account");
  }

  // Carregar utilizador da BD
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Se por algum motivo não existir (ex.: registo incompleto), volta ao login
  if (!dbUser) {
    redirect("/login?next=/account");
  }

  // Descobrir provider OAuth (se existir)
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
        <p className="text-gray-600">
          Manage your profile, security and personal info.
        </p>
      </div>

      <AccountClient
        userId={dbUser.id}
        email={dbUser.email!}
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
