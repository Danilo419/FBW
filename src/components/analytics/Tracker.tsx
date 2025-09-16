"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Envia um "page view" ao mudar de rota (skip /admin).
 * Usa navigator.sendBeacon para não bloquear a navegação.
 */
export default function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const path = `${pathname || "/"}${search?.toString() ? `?${search}` : ""}`;
    if (!path || path.startsWith("/admin")) return;        // não trackar admin
    if (lastSentRef.current === path) return;              // evita duplicados em dev
    lastSentRef.current = path;

    const payload = JSON.stringify({
      path,
      referrer: document.referrer || "",
    });

    const url = "/api/analytics";
    try {
      const blob = new Blob([payload], { type: "application/json; charset=UTF-8" });
      if (!navigator.sendBeacon || !navigator.sendBeacon(url, blob)) {
        // fallback
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload })
          .catch(() => {});
      }
    } catch {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload })
        .catch(() => {});
    }
  }, [pathname, search]);

  return null;
}
