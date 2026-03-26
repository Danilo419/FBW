// src/app/[locale]/checkout/success/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("CheckoutSuccessPage");

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-4 text-center">
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