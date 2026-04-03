import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useSubscriptions,
  useUpcomingSubscriptions,
  useSubscriptionSummary,
  useDeactivateSubscription,
  useCreateSubscription,
  useNotifications,
  useMarkNotificationRead,
} from "@/hooks/use-subscriptions";
import { useCurrency } from "@/hooks/use-currency";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, XCircle, Bell, DollarSign, CalendarClock,
  AlertTriangle, CheckCircle, Repeat, Plus, Sparkles,
} from "lucide-react";
import { format, differenceInDays, addMonths, addWeeks, addYears } from "date-fns";

const POPULAR_SERVICES = [
  "Netflix", "Spotify", "Amazon Prime", "YouTube Premium",
  "Disney+", "Apple TV+", "Hulu", "HBO Max",
  "Microsoft 365", "Adobe Creative Cloud", "Dropbox",
  "Google One", "iCloud", "LinkedIn Premium",
  "Gym Membership", "Insurance", "Other",
];

const addSubSchema = z.object({
  merchantName: z.string().min(1, "Service name is required"),
  customName: z.string().optional(),
  averageAmount: z.coerce.number({ invalid_type_error: "Enter a valid amount" }).positive("Amount must be positive"),
  cycle: z.enum(["monthly", "weekly", "yearly"], { required_error: "Select a billing cycle" }),
  nextExpectedDate: z.string().min(1, "Select next billing date"),
});
type AddSubForm = z.infer<typeof addSubSchema>;

function CycleBadge({ cycle }: { cycle: string }) {
  const colors: Record<string, string> = {
    monthly: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    weekly: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    yearly: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[cycle] || "bg-white/10 text-white/60 border-white/10"}`}>
      {cycle}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function ServiceIcon({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Netflix: "bg-red-500/20 text-red-400",
    Spotify: "bg-green-500/20 text-green-400",
    "Amazon Prime": "bg-amber-500/20 text-amber-400",
    "YouTube Premium": "bg-red-500/20 text-red-400",
    "Disney+": "bg-blue-500/20 text-blue-400",
    "Apple TV+": "bg-gray-500/20 text-gray-300",
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[name] || "bg-primary/10 text-primary"}`}>
      <RefreshCw className="w-5 h-5" />
    </div>
  );
}

function daysUntil(date: Date | string): number {
  return differenceInDays(new Date(date), new Date());
}

function getDefaultNextDate(cycle: string): string {
  const now = new Date();
  if (cycle === "monthly") return format(addMonths(now, 1), "yyyy-MM-dd");
  if (cycle === "weekly") return format(addWeeks(now, 1), "yyyy-MM-dd");
  if (cycle === "yearly") return format(addYears(now, 1), "yyyy-MM-dd");
  return format(addMonths(now, 1), "yyyy-MM-dd");
}

export default function Subscriptions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: subs, isLoading: subsLoading } = useSubscriptions();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingSubscriptions();
  const { data: summary } = useSubscriptionSummary();
  const { data: notifications } = useNotifications();
  const deactivate = useDeactivateSubscription();
  const createSub = useCreateSubscription();
  const markRead = useMarkNotificationRead();
  const currency = useCurrency();

  const unreadNotifications = (notifications || []).filter(n => !n.isRead);

  const form = useForm<AddSubForm>({
    resolver: zodResolver(addSubSchema),
    defaultValues: {
      merchantName: "",
      customName: "",
      averageAmount: undefined,
      cycle: "monthly",
      nextExpectedDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    },
  });

  const watchedService = form.watch("merchantName");
  const watchedCycle = form.watch("cycle");

  const onCycleChange = (val: string) => {
    form.setValue("cycle", val as "monthly" | "weekly" | "yearly");
    form.setValue("nextExpectedDate", getDefaultNextDate(val));
  };

  const onServiceChange = (val: string) => {
    form.setValue("merchantName", val);
    if (val !== "Other") form.setValue("customName", "");
  };

  const onSubmit = (data: AddSubForm) => {
    const finalName = data.merchantName === "Other" ? (data.customName || "Other") : data.merchantName;
    createSub.mutate(
      {
        merchantName: finalName,
        averageAmount: String(data.averageAmount),
        cycle: data.cycle,
        nextExpectedDate: new Date(data.nextExpectedDate).toISOString(),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset({
            merchantName: "",
            customName: "",
            averageAmount: undefined,
            cycle: "monthly",
            nextExpectedDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
          });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Subscriptions</h1>
            <p className="text-muted-foreground">Track your recurring charges and upcoming payments.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-add-subscription"
                className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-white">Add Subscription</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-white/80">Service</Label>
                  <Select value={watchedService} onValueChange={onServiceChange}>
                    <SelectTrigger data-testid="select-service" className="bg-black/50 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-white/10 text-white max-h-60">
                      {POPULAR_SERVICES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.merchantName && (
                    <p className="text-sm text-destructive">{form.formState.errors.merchantName.message}</p>
                  )}
                </div>

                {watchedService === "Other" && (
                  <div className="space-y-2">
                    <Label className="text-white/80">Custom Name</Label>
                    <Input
                      data-testid="input-custom-name"
                      {...form.register("customName")}
                      className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                      placeholder="e.g. My Gym, Cloud Storage..."
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Amount ({currency.code})</Label>
                    <Input
                      data-testid="input-sub-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register("averageAmount")}
                      className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                      placeholder="0.00"
                    />
                    {form.formState.errors.averageAmount && (
                      <p className="text-sm text-destructive">{form.formState.errors.averageAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Billing Cycle</Label>
                    <Select value={watchedCycle} onValueChange={onCycleChange}>
                      <SelectTrigger data-testid="select-cycle" className="bg-black/50 border-white/10 text-white h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] border-white/10 text-white">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Next Billing Date</Label>
                  <Input
                    data-testid="input-next-date"
                    type="date"
                    {...form.register("nextExpectedDate")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                  />
                  {form.formState.errors.nextExpectedDate && (
                    <p className="text-sm text-destructive">{form.formState.errors.nextExpectedDate.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-submit-subscription"
                  disabled={createSub.isPending}
                  className="w-full h-12 rounded-xl mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createSub.isPending ? "Saving..." : "Add Subscription"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Monthly Spend</p>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p data-testid="text-monthly-spend" className="text-3xl font-display font-bold text-white">
                {currency.format(summary?.totalMonthlySubscriptionSpend ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">estimated per month</p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <p data-testid="text-active-count" className="text-3xl font-display font-bold text-white">
                {summary?.activeSubscriptionCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">active services</p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <p className="text-3xl font-display font-bold text-white">
                {unreadNotifications.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">unread notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Debits Alert */}
        {!upcomingLoading && upcoming && upcoming.length > 0 && (
          <Card className="glass-card border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-400 text-base">
                <AlertTriangle className="w-5 h-5" />
                Upcoming Auto-Debits (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.map(sub => {
                const days = daysUntil(sub.nextExpectedDate);
                const isUrgent = days <= 2;
                return (
                  <div
                    key={sub.id}
                    data-testid={`upcoming-sub-${sub.id}`}
                    className={`flex items-center justify-between p-3 rounded-xl border ${isUrgent ? "border-rose-500/30 bg-rose-500/5" : "border-white/10 bg-white/5"}`}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarClock className={`w-5 h-5 ${isUrgent ? "text-rose-400" : "text-amber-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{sub.merchantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sub.nextExpectedDate), "MMM dd, yyyy")} · {days === 0 ? "Today" : `${days} day${days !== 1 ? "s" : ""} away`}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${isUrgent ? "text-rose-400" : "text-white"}`}>
                      {currency.formatRaw(sub.averageAmount)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        {unreadNotifications.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unreadNotifications.map(notif => (
                <div key={notif.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white/80">{notif.message}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-white ml-4 shrink-0"
                    onClick={() => markRead.mutate(notif.id)}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Subscriptions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Repeat className="w-5 h-5 text-primary" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : subs && subs.length > 0 ? (
              <div className="space-y-3">
                {subs.map(sub => {
                  const days = daysUntil(sub.nextExpectedDate);
                  const isUrgent = days >= 0 && days <= 3;
                  const isManual = sub.confidenceScore === 1.0;
                  return (
                    <div
                      key={sub.id}
                      data-testid={`subscription-card-${sub.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <ServiceIcon name={sub.merchantName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{sub.merchantName}</p>
                            <CycleBadge cycle={sub.cycle} />
                            {isManual && (
                              <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/20 text-primary border-primary/30 font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                manual
                              </span>
                            )}
                            {isUrgent && (
                              <span className="text-xs px-2 py-0.5 rounded-full border bg-rose-500/20 text-rose-400 border-rose-500/30 font-medium">
                                due soon
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-muted-foreground">
                              Next: {days < 0 ? "Overdue" : days === 0 ? "Today" : format(new Date(sub.nextExpectedDate), "MMM dd, yyyy")}
                            </p>
                            {!isManual && <ConfidenceBar score={sub.confidenceScore} />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            {currency.formatRaw(sub.averageAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">/ {sub.cycle}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-cancel-${sub.id}`}
                          className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => deactivate.mutate(sub.id)}
                          disabled={deactivate.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Repeat className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Subscriptions Yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                  Add your subscriptions manually using the button above, or they'll be auto-detected when you add recurring transactions.
                </p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
