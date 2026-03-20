const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
};

export function formatCurrency(amount: number, currencyCode: string = "INR"): string {
  const locale = CURRENCY_LOCALES[currencyCode] ?? "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currencyCode: string = "INR"): string {
  const locale = CURRENCY_LOCALES[currencyCode] ?? "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function getCurrencySymbol(currencyCode: string = "INR"): string {
  const locale = CURRENCY_LOCALES[currencyCode] ?? "en-IN";
  return (0).toLocaleString(locale, { style: "currency", currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, "").trim();
}
