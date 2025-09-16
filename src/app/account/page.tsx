// src/app/account/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

const fallbackImg =
  "https://api.dicebear.com/7.x/initials/svg?radius=50&backgroundType=gradientLinear&seed=FW";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="container-fw py-16">
        <h1 className="text-2xl font-bold mb-4">You must be logged in</h1>
        <Link
          href="/login"
          className="inline-flex items-center rounded-2xl border px-4 py-2 hover:bg-gray-50"
        >
          Go to login
        </Link>
      </div>
    );
  }

  // Load user from DB
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dbUser) {
    return (
      <div className="container-fw py-16">
        <h1 className="text-2xl font-bold mb-2">Account</h1>
        <p className="text-red-600">
          We couldn’t load your profile. Please sign out and in again.
        </p>
      </div>
    );
  }

  // Discover OAuth provider (if any)
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
        /** 👇 agora enviamos o ID para aparecer no Overview */
        userId={dbUser.id}
        email={dbUser.email!}
        defaultName={dbUser.name ?? ""}
        defaultImage={dbUser.image}
        createdAt={dbUser.createdAt.toISOString()}
        updatedAt={dbUser.updatedAt.toISOString()}
        provider={provider}
        fallbackImage={fallbackImg}
      />
    </div>
  );
}
