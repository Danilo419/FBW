// src/lib/money.ts

/**
 * Formata um valor em cêntimos para moeda legível.
 *
 * @param cents - valor em cêntimos
 * @param currency - código da moeda (default: EUR)
 * @param locale - locale opcional (ex: "pt-PT" ou "en-US")
 */
export function formatMoney(cents: number, currency = "EUR", locale?: string) {
  return new Intl.NumberFormat(locale ?? undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Alias de formatMoney para compatibilidade
 * (alguns ficheiros importam `money` em vez de `formatMoney`).
 */
export const money = formatMoney;
