// src/components/admin/NavButton.tsx
"use client";

import { useRouter } from "next/navigation";

export function NavButton({
  href,
  children,
  className = "",
}: { href: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.push(href)}>
      {children}
    </button>
  );
}
