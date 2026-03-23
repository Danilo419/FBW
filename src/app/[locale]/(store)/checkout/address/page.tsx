// src/app/[locale]/(store)/checkout/address/page.tsx
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CheckoutAddressClient from "./CheckoutAddressClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AddressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 🔑 Garante que o locale correto é usado no server
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "CheckoutAddressPage",
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-6 text-center">
        {t("title")}
      </h1>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-white p-5">
            {t("loading")}
          </div>
        }
      >
        <CheckoutAddressClient />
      </Suspense>
    </main>
  );
}