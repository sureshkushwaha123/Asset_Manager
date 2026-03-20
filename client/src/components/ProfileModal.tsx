import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User, Shield, SlidersHorizontal, BarChart3, Bell, Lock,
  Download, Trash2, Eye, EyeOff, Activity, TrendingUp,
  Wallet, Repeat, Heart, X,
} from "lucide-react";
import {
  useProfile, useFinancialSummary, useActivityLog,
  useUpdateProfile, useChangePassword, useUpdatePreferences,
  useUpdateNotifications, useDeleteAccount,
} from "@/hooks/use-profile";
import { useLogout } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];

const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  avatarUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  defaultCurrency: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6, "At least 6 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const prefSchema = z.object({
  savingsTargetPercent: z.coerce.number().min(0).max(100),
  riskAppetite: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type PrefForm = z.infer<typeof prefSchema>;

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { data: profile, isLoading } = useProfile();
  const { data: summary } = useFinancialSummary();
  const { data: activity } = useActivityLog();

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updatePrefs = useUpdatePreferences();
  const updateNotifs = useUpdateNotifications();
  const deleteAccount = useDeleteAccount();
  const logout = useLogout();
  const currency = useCurrency();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      defaultCurrency: profile?.defaultCurrency ?? "INR",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const prefForm = useForm<PrefForm>({
    resolver: zodResolver(prefSchema),
    values: {
      savingsTargetPercent: profile?.savingsTargetPercent ?? 20,
      riskAppetite: (profile?.riskAppetite as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
    },
  });

  const handleDeleteAccount = async () => {
    await deleteAccount.mutateAsync();
    logout();
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem("auth_token");
    fetch("/api/user/export-csv", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VaultAI_Transactions_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const initials = (profile?.fullName || profile?.username || "U")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const healthColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-[700px] w-full p-0 bg-background border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-emerald-500/10 to-transparent border-b border-white/10 p-6 shrink-0">
          <DialogHeader className="mb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg font-semibold">Account & Settings</DialogTitle>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="w-14 h-14 rounded-full bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36 bg-white/10" />
                <Skeleton className="h-3 w-24 bg-white/10" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-4">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/40 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-semibold text-white text-base leading-tight">
                  {profile?.fullName || profile?.username}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">@{profile?.username}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {profile?.role?.replace("ROLE_", "")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Joined {profile?.createdAt ? format(new Date(profile.createdAt), "MMMM yyyy") : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs — scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="profile">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-white/10">
              <TabsList className="w-full rounded-none bg-transparent h-auto p-1.5 grid grid-cols-6 gap-0.5">
                {[
                  { value: "profile",   icon: User,             label: "Profile" },
                  { value: "security",  icon: Shield,           label: "Security" },
                  { value: "prefs",     icon: SlidersHorizontal, label: "Prefs" },
                  { value: "snapshot",  icon: BarChart3,         label: "Summary" },
                  { value: "notifs",    icon: Bell,              label: "Alerts" },
                  { value: "privacy",   icon: Lock,              label: "Privacy" },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    data-testid={`tab-${tab.value}`}
                    className="flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg transition-all"
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── 1. PROFILE ── */}
            <TabsContent value="profile" className="p-6 space-y-4 mt-0">
              <form onSubmit={profileForm.handleSubmit(d => updateProfile.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Full Name</Label>
                    <Input
                      {...profileForm.register("fullName")}
                      data-testid="input-fullname"
                      placeholder="Your full name"
                      className="bg-black/40 border-white/10 text-white h-11 rounded-xl"
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Username (Login ID)</Label>
                    <Input
                      value={profile?.username || ""}
                      readOnly
                      className="bg-black/20 border-white/5 text-muted-foreground h-11 rounded-xl cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Default Currency</Label>
                    <Select
                      value={profileForm.watch("defaultCurrency")}
                      onValueChange={v => profileForm.setValue("defaultCurrency", v)}
                    >
                      <SelectTrigger data-testid="select-currency" className="bg-black/40 border-white/10 text-white h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Member Since</Label>
                    <Input
                      value={profile?.createdAt ? format(new Date(profile.createdAt), "dd MMM yyyy") : "—"}
                      readOnly
                      className="bg-black/20 border-white/5 text-muted-foreground h-11 rounded-xl cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/80 text-sm">Avatar URL</Label>
                  <Input
                    {...profileForm.register("avatarUrl")}
                    data-testid="input-avatar-url"
                    placeholder="https://example.com/your-photo.jpg"
                    className="bg-black/40 border-white/10 text-white h-11 rounded-xl"
                  />
                  {profileForm.formState.errors.avatarUrl && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.avatarUrl.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-save-profile"
                  disabled={updateProfile.isPending}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                >
                  {updateProfile.isPending ? "Saving..." : "Save Profile Changes"}
                </Button>
              </form>
            </TabsContent>

            {/* ── 2. SECURITY ── */}
            <TabsContent value="security" className="p-6 space-y-5 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Activity className="w-3.5 h-3.5" /> Last Login
                  </p>
                  <p className="text-sm font-medium text-white">
                    {profile?.lastLoginAt
                      ? format(new Date(profile.lastLoginAt), "dd MMM yyyy, hh:mm a")
                      : "Not recorded yet"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                  <p className="text-sm font-medium text-emerald-400">Active</p>
                </div>
              </div>

              <form onSubmit={passwordForm.handleSubmit(d => changePassword.mutate(d, {
                onSuccess: () => passwordForm.reset()
              }))} className="space-y-4">
                <p className="text-sm font-semibold text-white">Change Password</p>

                <div className="space-y-1.5">
                  <Label className="text-white/80 text-sm">Current Password</Label>
                  <div className="relative">
                    <Input
                      {...passwordForm.register("currentPassword")}
                      data-testid="input-current-password"
                      type={showCurrent ? "text" : "password"}
                      placeholder="••••••••"
                      className="bg-black/40 border-white/10 text-white h-11 rounded-xl pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrent(s => !s)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-white">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">New Password</Label>
                    <div className="relative">
                      <Input
                        {...passwordForm.register("newPassword")}
                        data-testid="input-new-password"
                        type={showNew ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-black/40 border-white/10 text-white h-11 rounded-xl pr-10"
                      />
                      <button type="button" onClick={() => setShowNew(s => !s)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-white">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Confirm Password</Label>
                    <Input
                      {...passwordForm.register("confirmPassword")}
                      data-testid="input-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-black/40 border-white/10 text-white h-11 rounded-xl"
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="button-change-password"
                  disabled={changePassword.isPending}
                  className="w-full h-11 rounded-xl"
                >
                  {changePassword.isPending ? "Updating..." : "Update Password"}
                </Button>
              </form>

              {activity && activity.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">Recent Activity</p>
                  <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
                    {activity.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-xs font-medium text-white">{a.action}</p>
                          {a.ipAddress && <p className="text-xs text-muted-foreground">IP: {a.ipAddress}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.createdAt), "dd MMM, HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── 3. FINANCIAL PREFERENCES ── */}
            <TabsContent value="prefs" className="p-6 space-y-5 mt-0">
              <form onSubmit={prefForm.handleSubmit(d => updatePrefs.mutate(d))} className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-white/80 text-sm">Savings Target</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={0} max={100} step={5}
                      {...prefForm.register("savingsTargetPercent")}
                      data-testid="slider-savings-target"
                      className="flex-1 accent-primary h-2"
                    />
                    <span className="text-primary font-bold text-sm w-12 text-right">
                      {prefForm.watch("savingsTargetPercent")}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target percentage of monthly income to save
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/80 text-sm">Risk Appetite</Label>
                  <Select
                    value={prefForm.watch("riskAppetite")}
                    onValueChange={v => prefForm.setValue("riskAppetite", v as "LOW" | "MEDIUM" | "HIGH")}
                  >
                    <SelectTrigger data-testid="select-risk" className="bg-black/40 border-white/10 text-white h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low — Conservative investor</SelectItem>
                      <SelectItem value="MEDIUM">Medium — Balanced approach</SelectItem>
                      <SelectItem value="HIGH">High — Aggressive growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  data-testid="button-save-prefs"
                  disabled={updatePrefs.isPending}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                >
                  {updatePrefs.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </form>
            </TabsContent>

            {/* ── 4. FINANCIAL SNAPSHOT ── */}
            <TabsContent value="snapshot" className="p-6 space-y-4 mt-0">
              <p className="text-sm font-semibold text-white">Your Financial Overview</p>
              {!summary ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-white/10" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Current Balance",
                      value: currency.format(summary.currentBalance),
                      icon: Wallet,
                      color: "text-primary",
                      bg: "bg-primary/10",
                      border: "border-primary/20",
                    },
                    {
                      label: "Monthly Spending",
                      value: currency.format(summary.totalMonthlySpending),
                      icon: TrendingUp,
                      color: "text-red-400",
                      bg: "bg-red-400/10",
                      border: "border-red-400/20",
                    },
                    {
                      label: "Active Subscriptions",
                      value: `${summary.activeSubscriptions} subscriptions`,
                      icon: Repeat,
                      color: "text-yellow-400",
                      bg: "bg-yellow-400/10",
                      border: "border-yellow-400/20",
                    },
                    {
                      label: "Health Score",
                      value: `${summary.financialHealthScore} / 100`,
                      icon: Heart,
                      color: healthColor(summary.financialHealthScore),
                      bg: "bg-white/5",
                      border: "border-white/10",
                    },
                  ].map(card => (
                    <div key={card.label} className={`rounded-xl ${card.bg} border ${card.border} p-4`}>
                      <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                        <card.icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── 5. NOTIFICATIONS ── */}
            <TabsContent value="notifs" className="p-6 space-y-4 mt-0">
              <p className="text-sm font-semibold text-white">Notification Preferences</p>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/10" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      key: "notificationBudget" as const,
                      label: "Budget Alerts",
                      desc: "Notified when spending nears budget limits",
                      value: profile?.notificationBudget ?? true,
                    },
                    {
                      key: "notificationSubscription" as const,
                      label: "Subscription Alerts",
                      desc: "Upcoming auto-debits and recurring payment reminders",
                      value: profile?.notificationSubscription ?? true,
                    },
                    {
                      key: "notificationAI" as const,
                      label: "AI Insights",
                      desc: "Personalized AI financial recommendations",
                      value: profile?.notificationAI ?? true,
                    },
                  ].map(pref => (
                    <div key={pref.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm font-medium text-white">{pref.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pref.desc}</p>
                      </div>
                      <Switch
                        data-testid={`toggle-${pref.key}`}
                        checked={pref.value}
                        onCheckedChange={checked => updateNotifs.mutate({ [pref.key]: checked })}
                        disabled={updateNotifs.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── 6. PRIVACY ── */}
            <TabsContent value="privacy" className="p-6 space-y-4 mt-0">
              <p className="text-sm font-semibold text-white">Privacy & Data</p>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" /> Export Your Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Download all your transaction history as a CSV file.
                </p>
                <Button
                  variant="outline"
                  data-testid="button-export-csv"
                  onClick={handleExportCSV}
                  className="w-full h-10 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Download className="w-4 h-4 mr-2" /> Export Transactions CSV
                </Button>
              </div>

              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-3">
                <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </p>
                <p className="text-xs text-muted-foreground">
                  Your account will be deactivated and you will be logged out. This cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      data-testid="button-delete-account"
                      className="w-full h-10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        Your account will be permanently deactivated. All data will be retained but you won't be able to log in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                        Yes, Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
