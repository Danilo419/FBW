// src/app/[locale]/(store)/checkout/page.tsx
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "checkoutPage" });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-center text-2xl font-extrabold">
        {t("title")}
      </h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            {t("loading")}
          </div>
        }
      >
        <CheckoutClient />
      </Suspense>
    </main>
  );
}