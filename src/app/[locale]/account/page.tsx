export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import AccountClient from "./AccountClient";

const fallbackImg =
  "https://api.dicebear.com/7.x/initials/svg?radius=50&backgroundType=gradientLinear&seed=FW";

export default async function AccountPage() {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "AccountPage",
  });

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/account`);
  }

  const email = session.user?.email ?? null;
  const name = session.user?.name ?? null;

  const dbUser =
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

  if (!dbUser) {
    return (
      <div className="container-fw py-16 space-y-4">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>

        <p className="text-gray-700">{t("profileLoadError")}</p>

        <p className="text-gray-600">
          {t.rich("profileLoadHelp", {
            b: (chunks) => <b>{chunks}</b>,
          })}
        </p>
      </div>
    );
  }

  const oauth = await prisma.account.findFirst({
    where: { userId: dbUser.id },
    select: { provider: true },
  });

  const provider = oauth?.provider
    ? oauth.provider.charAt(0).toUpperCase() + oauth.provider.slice(1)
    : t("credentialsProvider");

  return (
    <div className="container-fw py-16 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
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