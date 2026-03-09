import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useAskAI() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetchWithAuth(api.ai.ask.path, {
        method: api.ai.ask.method,
        body: JSON.stringify({ prompt }),
      });
      return api.ai.ask.responses[200].parse(await res.json());
    },
    onError: (err: Error) => {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    }
  });
}
