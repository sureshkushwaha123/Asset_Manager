import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAccounts, useCreateAccount } from "@/hooks/use-accounts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Landmark,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Wallet,
  DollarSign,
} from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "Checking", label: "Checking", icon: Landmark },
  { value: "Savings", label: "Savings", icon: PiggyBank },
  { value: "Credit Card", label: "Credit Card", icon: CreditCard },
  { value: "Investment", label: "Investment", icon: TrendingUp },
  { value: "Cash", label: "Cash", icon: Wallet },
];

const accountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().min(1, "Account type is required"),
  balance: z.coerce.number().min(0, "Balance cannot be negative"),
});
type AccountForm = z.infer<typeof accountSchema>;

function AccountTypeIcon({ type, className }: { type: string; className?: string }) {
  const found = ACCOUNT_TYPES.find((t) => t.value === type);
  const Icon = found?.icon ?? DollarSign;
  return <Icon className={className} />;
}

function AccountTypeColor(type: string): string {
  switch (type) {
    case "Checking": return "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400";
    case "Savings": return "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400";
    case "Credit Card": return "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400";
    case "Investment": return "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400";
    case "Cash": return "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400";
    default: return "from-primary/20 to-primary/10 border-primary/20 text-primary";
  }
}

export default function Accounts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();

  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: "",
      accountType: "",
      balance: 0,
    },
  });

  const onSubmit = (data: AccountForm) => {
    createAccount.mutate(
      { accountName: data.accountName, accountType: data.accountType, balance: String(data.balance) },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  const totalBalance = (accounts ?? []).reduce(
    (sum, acc) => sum + parseFloat(acc.balance as unknown as string),
    0
  );

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Accounts</h1>
            <p className="text-muted-foreground">Manage your linked financial accounts.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-add-account"
                className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-white">New Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Account Name</Label>
                  <Input
                    data-testid="input-account-name"
                    {...form.register("accountName")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                    placeholder="e.g. Main Checking"
                  />
                  {form.formState.errors.accountName && (
                    <p className="text-sm text-destructive">{form.formState.errors.accountName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Account Type</Label>
                  <Select
                    value={form.watch("accountType")}
                    onValueChange={(v) => form.setValue("accountType", v)}
                  >
                    <SelectTrigger
                      data-testid="select-account-type"
                      className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                    >
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-white/10 text-white">
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.accountType && (
                    <p className="text-sm text-destructive">{form.formState.errors.accountType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Starting Balance ($)</Label>
                  <Input
                    data-testid="input-account-balance"
                    type="number"
                    step="0.01"
                    {...form.register("balance")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl"
                    placeholder="0.00"
                  />
                  {form.formState.errors.balance && (
                    <p className="text-sm text-destructive">{form.formState.errors.balance.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-submit-account"
                  disabled={createAccount.isPending}
                  className="w-full h-12 rounded-xl mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createAccount.isPending ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Balance Summary */}
        <Card className="glass-card border-white/10 bg-gradient-to-r from-primary/10 to-emerald-500/10">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance Across All Accounts</p>
              <p data-testid="text-total-balance" className="text-4xl font-display font-bold text-white">
                ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card animate-pulse h-40" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => {
              const colorClass = AccountTypeColor(acc.accountType);
              const balance = parseFloat(acc.balance as unknown as string);
              return (
                <Card
                  key={acc.id}
                  data-testid={`card-account-${acc.id}`}
                  className="glass-card hover-elevate overflow-hidden"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} border flex items-center justify-center`}
                      >
                        <AccountTypeIcon type={acc.accountType} className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                        {acc.accountType}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{acc.accountName}</p>
                      <p
                        data-testid={`text-balance-${acc.id}`}
                        className={`text-3xl font-display font-bold ${balance < 0 ? "text-destructive" : "text-white"}`}
                      >
                        {balance < 0 ? "-" : ""}$
                        {Math.abs(balance).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Landmark className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-white mb-2">No Accounts Yet</h3>
            <p className="text-muted-foreground max-w-sm mb-8">
              Add your first account to start tracking your finances and linking transactions.
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Account
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
