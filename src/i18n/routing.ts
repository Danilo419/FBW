// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Idiomas disponíveis na loja
  locales: ["en", "pt"] as const,

  // Idioma padrão
  defaultLocale: "en",

  // Sempre mostrar o prefixo no URL (/en, /pt)
  localePrefix: "always"
});

export type AppLocale = (typeof routing.locales)[number];