// src/components/PtStockHeaderLink.tsx
"use client";

import Link from "next/link";
import { Truck } from "lucide-react";

export default function PtStockHeaderLink() {
  return (
    <Link
      href="/pt-stock"
      className="flex items-center gap-1.5 font-medium text-gray-700 hover:text-blue-700 transition"
      aria-label="Portugal Delivery (CTT Stock)"
    >
      <Truck className="h-4 w-4" />
      <span>Portugal Delivery</span>
    </Link>
  );
}