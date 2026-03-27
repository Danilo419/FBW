// src/app/[locale]/checkout/success/page.tsx
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutSuccessPage({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "CheckoutSuccessPage",
  });

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-center text-2xl font-extrabold">
        {t("title")}
      </h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5 text-center">
            {t("loadingOrder")}
          </div>
        }
      >
        <SuccessClient />
      </Suspense>
    </main>
  );
}