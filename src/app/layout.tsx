import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";

import SessionProviderClient from "@/components/auth/SessionProviderClient";
import Tracker from "@/components/analytics/Tracker";
import SiteChrome from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "FootballWorld",
  description: "Authentic & concept football jerseys with worldwide shipping.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderClient>
          {/* Qualquer componente com usePathname/useSearchParams deve estar dentro de <Suspense> */}
          <Suspense fallback={null}>
            <Tracker />
          </Suspense>
          <Suspense fallback={null}>
            <SiteChrome>{children}</SiteChrome>
          </Suspense>
        </SessionProviderClient>
      </body>
    </html>
  );
}
