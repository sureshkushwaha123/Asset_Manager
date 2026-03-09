import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";

export function useFinancialHealth() {
  return useQuery({
    queryKey: ["/api/ai/financial-health"],
    queryFn: async () => {
      const res = await fetchWithAuth(api.ai.financialHealth.path);
      return api.ai.financialHealth.responses[200].parse(await res.json());
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
