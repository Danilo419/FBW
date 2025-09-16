"use client";

import { usePathname } from "next/navigation";
// Ajusta estes imports para os teus caminhos reais:
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>; // sem header/footer no /admin
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
