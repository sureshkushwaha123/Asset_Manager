import { AppLayout } from "@/components/layout/AppLayout";
import {
  useSubscriptions,
  useUpcomingSubscriptions,
  useSubscriptionSummary,
  useDeactivateSubscription,
  useNotifications,
  useMarkNotificationRead,
} from "@/hooks/use-subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  XCircle,
  Bell,
  DollarSign,
  CalendarClock,
  AlertTriangle,
  CheckCircle,
  Repeat,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

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

function daysUntil(date: Date | string): number {
  return differenceInDays(new Date(date), new Date());
}

export default function Subscriptions() {
  const { data: subs, isLoading: subsLoading } = useSubscriptions();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingSubscriptions();
  const { data: summary } = useSubscriptionSummary();
  const { data: notifications } = useNotifications();
  const deactivate = useDeactivateSubscription();
  const markRead = useMarkNotificationRead();

  const unreadNotifications = (notifications || []).filter(n => !n.isRead);

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">Subscriptions</h1>
          <p className="text-muted-foreground">Auto-detected recurring charges from your transactions.</p>
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
                ${(summary?.totalMonthlySubscriptionSpend ?? 0).toFixed(2)}
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
              <p className="text-xs text-muted-foreground mt-1">detected services</p>
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
                      ${parseFloat(sub.averageAmount as unknown as string).toFixed(2)}
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
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : subs && subs.length > 0 ? (
              <div className="space-y-3">
                {subs.map(sub => {
                  const days = daysUntil(sub.nextExpectedDate);
                  const isUrgent = days >= 0 && days <= 3;
                  return (
                    <div
                      key={sub.id}
                      data-testid={`subscription-card-${sub.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <RefreshCw className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{sub.merchantName}</p>
                            <CycleBadge cycle={sub.cycle} />
                            {isUrgent && (
                              <span className="text-xs px-2 py-0.5 rounded-full border bg-rose-500/20 text-rose-400 border-rose-500/30 font-medium">
                                due soon
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-muted-foreground">
                              Next: {days < 0 ? "Overdue" : days === 0 ? "Today" : format(new Date(sub.nextExpectedDate), "MMM dd")}
                            </p>
                            <ConfidenceBar score={sub.confidenceScore} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">
                            ${parseFloat(sub.averageAmount as unknown as string).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">avg / {sub.cycle}</p>
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
                <h3 className="text-lg font-semibold text-white mb-2">No Subscriptions Detected</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Add at least 3 recurring transactions with similar descriptions and amounts. The system will auto-detect subscription patterns.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
