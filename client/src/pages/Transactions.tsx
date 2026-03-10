import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowDownRight, ArrowUpRight, Search, FileX } from "lucide-react";

// The schema from backend with overrides
const transactionSchema = z.object({
  accountId: z.coerce.number().min(1, "Account is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  type: z.enum(['DEBIT', 'CREDIT']),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().optional(),
});
type TransactionForm = z.infer<typeof transactionSchema>;

export default function Transactions() {
  const [filter, setFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: accounts } = useAccounts();
  const { data: transactionsData, isLoading } = useTransactions(
    filter === 'ALL' ? undefined : { type: filter }
  );
  const createTx = useCreateTransaction();

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: 0,
      type: 'DEBIT',
      category: '',
      description: '',
      amount: undefined,
    }
  });

  const onSubmit = (data: TransactionForm) => {
    createTx.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const transactions = transactionsData?.items || [];

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
                    <Input 
                      type="number" step="0.01" 
                      {...form.register("amount")}
                      className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="0.00"
                    />
                    {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Category</Label>
                  <Input 
                    {...form.register("category")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="e.g. Groceries, Salary"
                  />
                  {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Description</Label>
                  <Input 
                    {...form.register("description")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="Details about this transaction"
                  />
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
          {['ALL', 'DEBIT', 'CREDIT'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === t ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-white"
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'DEBIT' ? 'Expenses' : 'Income'}
            </button>
          ))}
        </div>

        {/* List */}
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-sm font-medium text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading transactions...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <FileX className="w-12 h-12 mb-3 opacity-20" />
                        <p>No transactions found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white'
                          }`}>
                            {tx.type === 'CREDIT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-white font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">Account #{tx.accountId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/5">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {format(new Date(tx.date), 'MMM dd, yyyy')}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-white'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
