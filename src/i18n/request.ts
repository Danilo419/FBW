// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // Garantir que o locale é válido
  const locale =
    requested && routing.locales.includes(requested as (typeof routing.locales)[number])
      ? (requested as (typeof routing.locales)[number])
      : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});