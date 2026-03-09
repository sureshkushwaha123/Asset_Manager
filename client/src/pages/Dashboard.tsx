import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subMonths, isAfter } from "date-fns";
import { useMemo } from "react";

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6'];

export default function Dashboard() {
  const { data: accountsData } = useAccounts();
  const { data: transactionsData } = useTransactions();

  // Computations
  const totalBalance = useMemo(() => {
    return accountsData?.reduce((acc, account) => acc + parseFloat(account.balance), 0) || 0;
  }, [accountsData]);

  const transactions = transactionsData?.items || [];
  
  const { totalIncome, totalExpense } = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount);
      if (curr.type === "CREDIT") acc.totalIncome += amt;
      else acc.totalExpense += amt;
      return acc;
    }, { totalIncome: 0, totalExpense: 0 });
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'DEBIT');
    const categories = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + parseFloat(curr.amount);
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
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
              <h3 className="text-3xl font-display font-bold text-white">${totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
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
              <h3 className="text-3xl font-display font-bold text-white">${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
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
              <h3 className="text-3xl font-display font-bold text-white">${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
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
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: '#ffffff05'}}
                      />
                      <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Not enough data to display chart.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Top Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full relative">
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No expenses recorded.
                  </div>
                )}
                {/* Custom Legend */}
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
