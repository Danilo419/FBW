"use client";

import { useEffect } from "react";

export default function ScrollWatcher({ threshold = 300 }: { threshold?: number }) {
  useEffect(() => {
    const handler = () => {
      // só adiciona 'scrolled' depois de passar o threshold
      document.body.classList.toggle("scrolled", window.scrollY > threshold);
    };
    handler(); // aplica estado inicial
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return null;
}
