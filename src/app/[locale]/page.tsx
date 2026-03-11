// src/app/[locale]/page.tsx  (SERVER component)

import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import HomeClient from "../HomeClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default function Page({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  // define o locale da página (/en ou /pt)
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="container-fw py-10">
          <div className="rounded-2xl border bg-white p-5 text-center">
            Loading…
          </div>
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}