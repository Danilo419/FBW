// src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import SessionProviderClient from "@/components/auth/SessionProviderClient";
import Tracker from "@/components/analytics/Tracker";
import SiteChrome from "@/components/site/SiteChrome";
import FreeShippingBannerServer from "@/components/FreeShippingBannerServer";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "FootballWorld",
  description: "Authentic & concept football jerseys with worldwide shipping.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProviderClient>
            <Suspense fallback={null}>
              <Tracker />
            </Suspense>

            <Suspense fallback={null}>
              <>
                <FreeShippingBannerServer />
                <SiteChrome>{children}</SiteChrome>
              </>
            </Suspense>
          </SessionProviderClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
