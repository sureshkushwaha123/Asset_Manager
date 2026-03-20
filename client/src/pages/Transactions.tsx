import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowDownRight, ArrowUpRight, FileX, Repeat, Landmark } from "lucide-react";

const transactionSchema = z.object({
  accountId: z.coerce.number().min(1, "Account is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  type: z.enum(['DEBIT', 'CREDIT']),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().optional(),
});
type TransactionForm = z.infer<typeof transactionSchema>;

type FilterType = 'ALL' | 'DEBIT' | 'CREDIT' | 'RECURRING';

export default function Transactions() {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const currency = useCurrency();

  const { data: accounts } = useAccounts();
  const { data: transactionsData, isLoading } = useTransactions(
    filter === 'RECURRING'
      ? { recurring: true } as any
      : filter === 'ALL'
        ? undefined
        : { type: filter }
  );
  const createTx = useCreateTransaction();

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { accountId: 0, type: 'DEBIT', category: '', description: '', amount: undefined },
  });

  const onSubmit = (data: TransactionForm) => {
    createTx.mutate(data, {
      onSuccess: () => { setIsDialogOpen(false); form.reset(); }
    });
  };

  const transactions = transactionsData?.items || [];
  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a.accountName]));

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'DEBIT', label: 'Expenses' },
    { key: 'CREDIT', label: 'Income' },
    { key: 'RECURRING', label: 'Recurring' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Transactions</h1>
            <p className="text-muted-foreground">View and manage your recent activity.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                <Plus className="w-5 h-5 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-white">New Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Account</Label>
                  <Select value={String(form.watch('accountId'))} onValueChange={(v) => form.setValue('accountId', Number(v))}>
                    <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 rounded-xl">
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-white/10 text-white">
                      {accounts && accounts.length > 0 ? (
                        accounts.map(acc => (
                          <SelectItem key={acc.id} value={String(acc.id)}>{acc.accountName}</SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">No accounts available. Create one first.</div>
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.accountId && <p className="text-sm text-destructive">{form.formState.errors.accountId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Type</Label>
                    <Select onValueChange={(v: any) => form.setValue('type', v)} defaultValue="DEBIT">
                      <SelectTrigger className="bg-black/50 border-white/10 text-white h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] border-white/10 text-white">
                        <SelectItem value="DEBIT">Expense</SelectItem>
                        <SelectItem value="CREDIT">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Amount ($)</Label>
                    <Input type="number" step="0.01" {...form.register("amount")} className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="0.00" />
                    {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Category</Label>
                  <Input {...form.register("category")} className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="e.g. Groceries, Salary" />
                  {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Description</Label>
                  <Input {...form.register("description")} className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="Details about this transaction" />
                  {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
                </div>

                <Button type="submit" disabled={createTx.isPending} className="w-full h-12 rounded-xl mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createTx.isPending ? "Saving..." : "Save Transaction"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex bg-card/50 p-1 rounded-xl w-fit border border-white/5 shadow-inner">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                filter === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {f.key === 'RECURRING' && <Repeat className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-2xl bg-card/50 animate-pulse border border-white/5" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-24">
            <FileX className="w-16 h-16 text-white/10 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Transactions</h3>
            <p className="text-muted-foreground">
              {filter === 'RECURRING' ? 'No recurring transactions detected yet.' : 'Add your first transaction to get started.'}
            </p>
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    data-testid={`transaction-row-${tx.id}`}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'CREDIT' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                        {tx.type === 'CREDIT'
                          ? <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                          : <ArrowDownRight className="w-5 h-5 text-destructive" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{tx.description}</p>
                          {tx.isRecurring && (
                            <span
                              data-testid={`badge-recurring-${tx.id}`}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30"
                            >
                              <Repeat className="w-3 h-3" />
                              {tx.recurringCycle || 'recurring'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{tx.category}</span>
                          <span className="text-white/20">·</span>
                          <span>{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                          {accountMap[tx.accountId] && (
                            <>
                              <span className="text-white/20">·</span>
                              <span
                                data-testid={`tx-account-${tx.id}`}
                                className="flex items-center gap-1 text-primary/80"
                              >
                                <Landmark className="w-3 h-3" />
                                {accountMap[tx.accountId]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{currency.format(parseFloat(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
