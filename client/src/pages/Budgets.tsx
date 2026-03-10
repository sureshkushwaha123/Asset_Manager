import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBudgets, useCreateBudget } from "@/hooks/use-budgets";
import { useTransactions } from "@/hooks/use-transactions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, AlertCircle } from "lucide-react";
import { startOfMonth, isAfter } from "date-fns";

const budgetSchema = z.object({
  category: z.string().min(1, "Category required"),
  monthlyLimit: z.coerce.number().min(1, "Must be greater than 0"),
  alertThreshold: z.coerce.number().min(1).max(100).default(80),
});
type BudgetForm = z.infer<typeof budgetSchema>;

export default function Budgets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: budgets, isLoading: isBudgetsLoading } = useBudgets();
  const { data: txData } = useTransactions({ type: 'DEBIT' });
  const createBudget = useCreateBudget();

  const form = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { 
      category: '',
      monthlyLimit: undefined,
      alertThreshold: 80 
    }
  });

  const onSubmit = (data: BudgetForm) => {
    // Ensure all required fields are present and valid
    const validatedData = {
      category: data.category,
      monthlyLimit: Number(data.monthlyLimit),
      alertThreshold: Number(data.alertThreshold || 80)
    };
    createBudget.mutate(validatedData, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  // Calculate current month spending per category
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthSpending = (txData?.items || [])
    .filter(tx => isAfter(new Date(tx.date), currentMonthStart))
    .reduce((acc, tx) => {
      acc[tx.category.toLowerCase()] = (acc[tx.category.toLowerCase()] || 0) + parseFloat(tx.amount);
      return acc;
    }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Budgets</h1>
            <p className="text-muted-foreground">Keep your spending in check.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                <Plus className="w-5 h-5 mr-2" />
                Create Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-white">New Budget Limit</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Category</Label>
                  <Input 
                    {...form.register("category")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="e.g. Groceries"
                  />
                  {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Monthly Limit ($)</Label>
                  <Input 
                    type="number" step="0.01"
                    {...form.register("monthlyLimit")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="500.00"
                  />
                  {form.formState.errors.monthlyLimit && <p className="text-sm text-destructive">{form.formState.errors.monthlyLimit.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80">Alert Threshold (%)</Label>
                  <Input 
                    type="number"
                    {...form.register("alertThreshold")}
                    className="bg-black/50 border-white/10 text-white h-12 rounded-xl" placeholder="80"
                  />
                  <p className="text-xs text-muted-foreground">We'll alert you when spending reaches this percentage.</p>
                </div>

                <Button type="submit" disabled={createBudget.isPending} className="w-full h-12 rounded-xl mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createBudget.isPending ? "Creating..." : "Create Budget"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isBudgetsLoading ? (
             <div className="col-span-full py-12 text-center text-muted-foreground">Loading budgets...</div>
          ) : budgets?.length === 0 ? (
            <div className="col-span-full py-12 text-center flex flex-col items-center">
               <Target className="w-16 h-16 text-white/10 mb-4" />
               <h3 className="text-xl font-medium text-white mb-2">No Budgets Set</h3>
               <p className="text-muted-foreground">Create a budget to track your category spending.</p>
            </div>
          ) : (
            budgets?.map(budget => {
              const spent = currentMonthSpending[budget.category.toLowerCase()] || 0;
              const limit = parseFloat(budget.monthlyLimit);
              const percentage = Math.min((spent / limit) * 100, 100);
              const threshold = parseFloat(budget.alertThreshold);
              
              const isOver = spent > limit;
              const isWarning = percentage >= threshold && !isOver;

              return (
                <Card key={budget.id} className="glass-card hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl text-white">{budget.category}</CardTitle>
                      {isOver ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : isWarning ? (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Spent: <span className="text-white font-medium">${spent.toFixed(2)}</span></span>
                        <span className="text-muted-foreground">Limit: <span className="text-white font-medium">${limit.toFixed(2)}</span></span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 bg-white/10 [&>div]:bg-primary ${isOver ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`} 
                      />
                    </div>
                    <p className={`text-sm ${isOver ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {isOver 
                        ? `Over budget by ${(spent - limit).toFixed(2)}` 
                        : `${(limit - spent).toFixed(2)} remaining this month`}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
