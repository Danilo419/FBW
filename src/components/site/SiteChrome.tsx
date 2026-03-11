"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";

  const isAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/en/admin" ||
    pathname.startsWith("/en/admin/") ||
    pathname === "/pt/admin" ||
    pathname.startsWith("/pt/admin/");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}