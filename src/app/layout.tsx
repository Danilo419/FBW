// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";

// Estes dois são Client Components e usam usePathname / useSearchParams
import Tracker from "@/components/analytics/Tracker";
import SiteChrome from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "FootballWorld",
  description: "Authentic & concept football jerseys with worldwide shipping.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Qualquer componente que use useSearchParams/usePathname
            precisa estar dentro de <Suspense> */}
        <Suspense fallback={null}>
          <Tracker />
        </Suspense>

        {/* Se o SiteChrome usa usePathname (ex.: navegação ativa), também precisa de Suspense */}
        <Suspense fallback={null}>
          <SiteChrome>{children}</SiteChrome>
        </Suspense>
      </body>
    </html>
  );
}
