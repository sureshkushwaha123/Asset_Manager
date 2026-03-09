import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type CreateTransactionInput = z.infer<typeof api.transactions.create.input>;

export function useTransactions(filters?: { type?: 'DEBIT' | 'CREDIT' }) {
  return useQuery({
    queryKey: [api.transactions.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append("type", filters.type);
      
      const url = `${api.transactions.list.path}?${params.toString()}`;
      const res = await fetchWithAuth(url);
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const res = await fetchWithAuth(api.transactions.create.path, {
        method: api.transactions.create.method,
        body: JSON.stringify(data),
      });
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] }); // Update balances
      toast({ title: "Transaction Added", description: "Your transaction has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
