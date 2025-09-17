// src/lib/url.ts

// Funciona em server e client (no client usa window.location).
export function getBaseUrl(): string {
  // Client: usa o origin atual
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Vercel: host dinâmico (production e preview) sem protocolo
  const vercelUrl = process.env.VERCEL_URL; // ex.: "meu-app.vercel.app"
  if (vercelUrl && vercelUrl.length > 0) {
    return `https://${vercelUrl}`;
  }

  // Fallbacks configuráveis (úteis p/ emails/SEO)
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "";

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  // Dev local
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
