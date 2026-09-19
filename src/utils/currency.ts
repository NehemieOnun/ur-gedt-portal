export type CurrencyCode = "EUR" | "USD" | "CDF";

export interface ExchangeRates {
  baseCurrency: string;
  eurToUsd: number;
  eurToCdf: number;
}

export const DEFAULT_RATES: ExchangeRates = { baseCurrency: "EUR", eurToUsd: 1.0, eurToCdf: 2800.0 };

function toEur(value: number, currency: CurrencyCode, rates: ExchangeRates): number {
  if (currency === "EUR") return value;
  if (currency === "USD") return value / (rates.eurToUsd || 1);
  return value / (rates.eurToCdf || 1);
}

export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates = DEFAULT_RATES
): number {
  if (!amount || from === to) return amount || 0;
  const eurAmount = toEur(amount, from, rates);
  if (to === "EUR") return eurAmount;
  if (to === "USD") return eurAmount * (rates.eurToUsd || 1);
  return eurAmount * (rates.eurToCdf || 1);
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = { EUR: "\u20AC", USD: "$", CDF: "FC" };
  const rounded = Math.round(amount || 0);
  return rounded.toLocaleString("fr-FR") + " " + symbols[currency];
}

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  EUR: "Euro (EUR)",
  USD: "Dollar US (USD)",
  CDF: "Franc Congolais (CDF)",
};