import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

export function useCurrency() {
  const { user } = useAuth();
  const code = (user as any)?.defaultCurrency ?? "INR";

  return {
    code,
    symbol: getCurrencySymbol(code),
    format: (amount: number) => formatCurrency(amount, code),
    formatRaw: (amount: number | string) => formatCurrency(parseFloat(amount as string) || 0, code),
  };
}
