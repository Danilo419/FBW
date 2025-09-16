// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "../components/Providers";
import SiteChrome from "../components/site/SiteChrome";
import Tracker from "@/components/analytics/Tracker";

export const metadata: Metadata = {
  title: "FootballWorld",
  description: "Concept football jerseys with WOW effect",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 font-outfit antialiased">
        <Providers>
          {/* Tracker de visitas (ignora rotas /admin) */}
          <Tracker />
          {/* SiteChrome mostra Header/Footer fora de /admin */}
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
