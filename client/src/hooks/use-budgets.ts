import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type CreateBudgetInput = z.infer<typeof api.budgets.create.input>;

export function useBudgets() {
  return useQuery({
    queryKey: [api.budgets.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.budgets.list.path);
      return api.budgets.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBudgetInput) => {
      const res = await fetchWithAuth(api.budgets.create.path, {
        method: api.budgets.create.method,
        body: JSON.stringify(data),
      });
      return api.budgets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({ title: "Budget Created", description: "Your budget limit has been set." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
