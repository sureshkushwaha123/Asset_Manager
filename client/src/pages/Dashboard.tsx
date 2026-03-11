import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useFinancialHealth } from "@/hooks/use-financial-health";
import { useDownloadMonthlyReport } from "@/hooks/use-report";
import { useSubscriptions, useUpcomingSubscriptions, useSubscriptionSummary, useDeactivateSubscription } from "@/hooks/use-subscriptions";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Activity, TrendingUp, Download,
  Repeat, XCircle, CalendarClock, AlertTriangle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subMonths, isAfter, differenceInDays } from "date-fns";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6'];

export default function Dashboard() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: accountsData } = useAccounts();
  const { data: transactionsData } = useTransactions();
  const { data: healthData } = useFinancialHealth();
  const { data: subSummary } = useSubscriptionSummary();
  const { data: subs } = useSubscriptions();
  const { data: upcoming } = useUpcomingSubscriptions();
  const deactivate = useDeactivateSubscription();
  const downloadReport = useDownloadMonthlyReport();

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try { await downloadReport(); } finally { setIsDownloading(false); }
  };

  const totalBalance = useMemo(() =>
    accountsData?.reduce((acc, account) => acc + parseFloat(account.balance), 0) || 0,
    [accountsData]
  );

  const transactions = transactionsData?.items || [];

  const { totalIncome, totalExpense } = useMemo(() =>
    transactions.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount);
      if (curr.type === "CREDIT") acc.totalIncome += amt;
      else acc.totalExpense += amt;
      return acc;
    }, { totalIncome: 0, totalExpense: 0 }),
    [transactions]
  );

  const expensesByCategory = useMemo(() => {
    const categories = transactions.filter(t => t.type === 'DEBIT').reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + parseFloat(curr.amount);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(categories).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [transactions]);

  const monthlySpending = useMemo(() => {
    const sixMonthsAgo = subMonths(new Date(), 6);
    const recent = transactions.filter(t => isAfter(new Date(t.date), sixMonthsAgo));
    const monthly = recent.reduce((acc, curr) => {
      const month = format(new Date(curr.date), 'MMM');
      if (!acc[month]) acc[month] = { name: month, income: 0, expense: 0 };
      const amt = parseFloat(curr.amount);
      if (curr.type === 'CREDIT') acc[month].income += amt;
      else acc[month].expense += amt;
      return acc;
    }, {} as Record<string, any>);
    return Object.values(monthly).reverse();
  }, [transactions]);

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your financial health.</p>
        </header>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-display font-bold text-white">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </CardContent>
          </Card>
          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-3xl font-display font-bold text-white">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </CardContent>
          </Card>
          <Card className="glass-card hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                </div>
              </div>
              <h3 className="text-3xl font-display font-bold text-white">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Summary + Upcoming Debits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Subscriptions Widget */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Repeat className="w-5 h-5 text-primary" />
                Active Subscriptions
              </CardTitle>
              <div className="flex items-center gap-3">
                {subSummary && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="text-sm font-bold text-white">${subSummary.totalMonthlySubscriptionSpend.toFixed(2)}</p>
                  </div>
                )}
                <Link href="/subscriptions">
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {subs && subs.length > 0 ? (
                <div className="space-y-2">
                  {subs.slice(0, 4).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Repeat className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{sub.merchantName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{sub.cycle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">${parseFloat(sub.averageAmount as unknown as string).toFixed(2)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                          onClick={() => deactivate.mutate(sub.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {subs.length > 4 && (
                    <Link href="/subscriptions">
                      <p className="text-xs text-center text-muted-foreground hover:text-white cursor-pointer pt-1">
                        +{subs.length - 4} more subscriptions
                      </p>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Repeat className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No subscriptions detected yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add recurring transactions to enable detection.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Debits */}
          <Card className={`glass-card ${upcoming && upcoming.length > 0 ? "border-amber-500/20" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                Upcoming Auto-Debits
                {upcoming && upcoming.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {upcoming.length} this week
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming && upcoming.length > 0 ? (
                <div className="space-y-2">
                  {upcoming.map(sub => {
                    const days = differenceInDays(new Date(sub.nextExpectedDate), new Date());
                    const isUrgent = days <= 2;
                    return (
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${isUrgent ? "border-rose-500/30 bg-rose-500/5" : "border-white/10 bg-white/5"}`}
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`w-4 h-4 shrink-0 ${isUrgent ? "text-rose-400" : "text-amber-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-white">{sub.merchantName}</p>
                            <p className="text-xs text-muted-foreground">
                              {days === 0 ? "Today" : `In ${days} day${days !== 1 ? "s" : ""}`} · {format(new Date(sub.nextExpectedDate), "MMM dd")}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${isUrgent ? "text-rose-400" : "text-white"}`}>
                          ${parseFloat(sub.averageAmount as unknown as string).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CalendarClock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No upcoming auto-debits in the next 7 days.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Health Card */}
        {healthData && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Financial Health
              </CardTitle>
              <Button size="sm" variant="outline" onClick={handleDownloadReport} disabled={isDownloading} className="gap-2" data-testid="button-download-report">
                <Download className="w-4 h-4" />
                {isDownloading ? "Generating..." : "Report"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Health Score</p>
                  <div className="text-4xl font-bold text-emerald-500">{healthData.score}</div>
                  <p className="text-xs text-muted-foreground mt-1">/100</p>
                </div>
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">{healthData.score}%</div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/80 italic mb-3">{healthData.summary}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Key Insights</p>
                {healthData.insights.slice(0, 2).map((insight, i) => (
                  <p key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span><span>{insight}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Recommendations</p>
                {healthData.recommendations.slice(0, 2).map((rec, i) => (
                  <p key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">→</span><span>{rec}</span>
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-primary" />
                Cash Flow (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {monthlySpending.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{ fill: '#ffffff05' }} />
                      <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Not enough data to display chart.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Top Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full relative">
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No expenses recorded.</div>
                )}
                {expensesByCategory.length > 0 && (
                  <div className="absolute bottom-0 w-full flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                    {expensesByCategory.slice(0, 3).map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-1 text-white/80">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[80px]">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
