// src/app/products/ProductsClient.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductsClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/clubs"); // redirect silencioso
  }, [router]);

  return null; // não renderiza nada
}
