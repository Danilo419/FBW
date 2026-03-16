"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession(); // 'loading' | 'authenticated' | 'unauthenticated'
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      // redireciona para login mantendo o locale atual
      router.replace({
        pathname: "/account/login",
        query: {
          next: pathname || "/admin",
        },
      });
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return null; // podes trocar por spinner se quiseres
  }

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}