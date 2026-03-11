import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { Subscription, Notification } from "@shared/schema";

export function useSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: [api.subscriptions.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.subscriptions.list.path);
      return res.json();
    },
  });
}

export function useUpcomingSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: [api.subscriptions.upcoming.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.subscriptions.upcoming.path);
      return res.json();
    },
  });
}

export function useSubscriptionSummary() {
  return useQuery<{ totalMonthlySubscriptionSpend: number; activeSubscriptionCount: number }>({
    queryKey: [api.subscriptions.summary.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.subscriptions.summary.path);
      return res.json();
    },
  });
}

export function useDeactivateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetchWithAuth(`/api/subscriptions/deactivate/${id}`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.upcoming.path] });
      queryClient.invalidateQueries({ queryKey: [api.subscriptions.summary.path] });
      toast({ title: "Subscription Cancelled", description: "The subscription has been marked as inactive." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel subscription.", variant: "destructive" });
    },
  });
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.notifications.list.path);
      return res.json();
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetchWithAuth(`/api/notifications/${id}/read`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}
