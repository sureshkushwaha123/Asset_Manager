import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type UserProfile = {
  id: number;
  username: string;
  role: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  savingsTargetPercent: number;
  riskAppetite: string;
  defaultCurrency: string;
  notificationBudget: boolean;
  notificationSubscription: boolean;
  notificationAI: boolean;
  isDeleted: boolean;
};

export type FinancialSummary = {
  currentBalance: number;
  totalMonthlySpending: number;
  activeSubscriptions: number;
  financialHealthScore: number;
};

export type ActivityLog = {
  id: number;
  userId: number;
  action: string;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });
}

export function useFinancialSummary() {
  return useQuery<FinancialSummary>({
    queryKey: ["/api/user/financial-summary"],
  });
}

export function useActivityLog() {
  return useQuery<ActivityLog[]>({
    queryKey: ["/api/user/activity"],
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { fullName?: string; avatarUrl?: string; defaultCurrency?: string }) =>
      apiRequest("PUT", "/api/user/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("PUT", "/api/user/change-password", data),
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { savingsTargetPercent?: number; riskAppetite?: string }) =>
      apiRequest("PUT", "/api/user/preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Preferences saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save preferences", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { notificationBudget?: boolean; notificationSubscription?: boolean; notificationAI?: boolean }) =>
      apiRequest("PUT", "/api/user/notifications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Notification preferences updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update notifications", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteAccount() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => apiRequest("PUT", "/api/user/delete-account", {}),
    onSuccess: () => {
      toast({ title: "Account deactivated. You will be logged out." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to deactivate account", description: err.message, variant: "destructive" });
    },
  });
}
