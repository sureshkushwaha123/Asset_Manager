import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { runSubscriptionDetection, runNightlyDetection } from "./subscriptionDetector";

const JWT_SECRET = process.env.SESSION_SECRET || "fallback_secret_for_dev";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ message: "No token provided" });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ---- Auth Routes ----
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) return res.status(400).json({ message: "Username already exists" });
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      await storage.updateLastLogin(user.id);
      await storage.logActivity(user.id, "Login", req.ip, req.headers["user-agent"]);
      const updatedUser = await storage.getUser(user.id);
      res.status(200).json({ user: updatedUser, token });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  // ---- User Profile Routes ----

  app.get('/api/user/profile', authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
    try {
      const schema = z.object({
        fullName: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().optional().or(z.literal("")),
        defaultCurrency: z.enum(["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"]).optional(),
      });
      const data = schema.parse(req.body);
      const user = await storage.updateUserProfile(req.user.id, data);
      await storage.logActivity(req.user.id, "Profile updated", req.ip, req.headers["user-agent"]);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put('/api/user/change-password', authenticateToken, async (req: any, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      });
      const { currentPassword, newPassword } = schema.parse(req.body);
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.user.id, hashed);
      await storage.logActivity(req.user.id, "Password changed", req.ip, req.headers["user-agent"]);
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.put('/api/user/preferences', authenticateToken, async (req: any, res) => {
    try {
      const schema = z.object({
        savingsTargetPercent: z.number().min(0).max(100).optional(),
        riskAppetite: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      });
      const data = schema.parse(req.body);
      const user = await storage.updateUserPreferences(req.user.id, data);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.put('/api/user/notifications', authenticateToken, async (req: any, res) => {
    try {
      const schema = z.object({
        notificationBudget: z.boolean().optional(),
        notificationSubscription: z.boolean().optional(),
        notificationAI: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const user = await storage.updateUserNotifications(req.user.id, data);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  app.get('/api/user/financial-summary', authenticateToken, async (req: any, res) => {
    try {
      const uid = req.user.id;
      const [accsResult, txResult, subSummary] = await Promise.all([
        storage.getAccounts(uid),
        storage.getTransactions(uid, { limit: 1000 }),
        storage.getSubscriptionSummary(uid),
      ]);
      const currentBalance = accsResult.reduce((s, a) => s + parseFloat(a.balance as unknown as string), 0);
      const txList = txResult.items;
      const totalMonthlySpending = txList.filter(t => t.type === "DEBIT").reduce((s, t) => s + parseFloat(t.amount as unknown as string), 0);
      const totalIncome = txList.filter(t => t.type === "CREDIT").reduce((s, t) => s + parseFloat(t.amount as unknown as string), 0);
      const totalExpense = totalMonthlySpending;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      let savingsRateScore = 0;
      if (savingsRate > 30) savingsRateScore = 30;
      else if (savingsRate > 20) savingsRateScore = 20;
      else if (savingsRate > 10) savingsRateScore = 10;
      const budgets = await storage.getBudgets(uid);
      let budgetAdherenceScore = 20;
      const categorySpending = txList.filter(t => t.type === "DEBIT").reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount as unknown as string); return acc;
      }, {} as Record<string, number>);
      for (const b of budgets) {
        if ((categorySpending[b.category] || 0) > parseFloat(b.monthlyLimit as unknown as string)) budgetAdherenceScore -= 10;
      }
      let categoryBalanceScore = 25;
      for (const cat of ["Entertainment", "Shopping", "Subscription"]) {
        if (categorySpending[cat] && totalExpense > 0 && (categorySpending[cat] / totalExpense) * 100 > 25) categoryBalanceScore -= 8;
      }
      categoryBalanceScore = Math.max(0, categoryBalanceScore);
      const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
      let incomeExpenseScore = 0;
      if (incomeExpenseRatio < 50) incomeExpenseScore = 25;
      else if (incomeExpenseRatio < 70) incomeExpenseScore = 20;
      else if (incomeExpenseRatio < 90) incomeExpenseScore = 10;
      const financialHealthScore = Math.round(Math.min(100, savingsRateScore + budgetAdherenceScore + categoryBalanceScore + incomeExpenseScore));
      res.json({ currentBalance, totalMonthlySpending, activeSubscriptions: subSummary.activeSubscriptionCount, financialHealthScore });
    } catch (err) {
      console.error("Financial summary error:", err);
      res.status(500).json({ message: "Failed to get financial summary" });
    }
  });

  app.get('/api/user/activity', authenticateToken, async (req: any, res) => {
    const activity = await storage.getUserActivity(req.user.id);
    res.json(activity);
  });

  app.get('/api/user/export-csv', authenticateToken, async (req: any, res) => {
    try {
      const accounts = await storage.getAccounts(req.user.id);
      const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.accountName]));
      const { items } = await storage.getTransactions(req.user.id, { limit: 10000 });
      const csvRows = [
        ["Date", "Account", "Description", "Category", "Type", "Amount", "Recurring"].join(","),
        ...items.map(t => [
          new Date(t.date).toLocaleDateString(),
          accountMap[t.accountId] || "",
          `"${(t.description || "").replace(/"/g, '""')}"`,
          t.category,
          t.type,
          parseFloat(t.amount as unknown as string).toFixed(2),
          t.isRecurring ? "Yes" : "No",
        ].join(","))
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="VaultAI_Transactions_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csvRows.join("\n"));
    } catch {
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.put('/api/user/delete-account', authenticateToken, async (req: any, res) => {
    try {
      await storage.logActivity(req.user.id, "Account deleted", req.ip, req.headers["user-agent"]);
      await storage.softDeleteUser(req.user.id);
      res.json({ message: "Account has been deactivated" });
    } catch {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // ---- Accounts Routes ----
  app.get(api.accounts.list.path, authenticateToken, async (req: any, res) => {
    const accounts = await storage.getAccounts(req.user.id);
    res.json(accounts);
  });

  app.post(api.accounts.create.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.accounts.create.input.parse(req.body);
      const account = await storage.createAccount({ ...input, userId: req.user.id });
      res.status(201).json(account);
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // ---- Transactions Routes ----
  app.get(api.transactions.list.path, authenticateToken, async (req: any, res) => {
    try {
      const { type, page, limit, recurring } = req.query;
      const filters: any = {};
      if (type) filters.type = type;
      if (recurring === 'true') filters.recurring = true;
      const limitNum = limit ? parseInt(limit as string) : 50;
      const pageNum = page ? parseInt(page as string) : 1;
      filters.limit = limitNum;
      filters.offset = (pageNum - 1) * limitNum;
      const result = await storage.getTransactions(req.user.id, filters);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.transactions.summary.path, authenticateToken, async (req: any, res) => {
    const summary = await storage.getTransactionSummary(req.user.id);
    res.json(summary);
  });

  app.post(api.transactions.create.path, authenticateToken, async (req: any, res) => {
    try {
      const requestSchema = api.transactions.create.input.extend({
        accountId: z.coerce.number(),
        amount: z.string().or(z.number()).transform(v => String(v)),
      });
      const input = requestSchema.parse(req.body);

      let category = input.category;
      if (!category) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-5.1",
            messages: [
              { role: "system", content: "Classify this transaction into a financial category. Possible categories: Food, Travel, Bills, Entertainment, Subscription, Shopping, Salary, Other. Reply with JUST the category name." },
              { role: "user", content: input.description }
            ],
            max_completion_tokens: 10,
          });
          category = response.choices[0].message.content?.trim() || "Other";
        } catch {
          category = "Other";
        }
      }

      const transaction = await storage.createTransaction({
        ...input,
        userId: req.user.id,
        category: category!,
        date: input.date ? new Date(input.date) : new Date(),
      });

      // Run subscription detection asynchronously (non-blocking)
      setImmediate(() => runSubscriptionDetection(req.user.id).catch(console.error));

      res.status(201).json(transaction);
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---- Budgets Routes ----
  app.get(api.budgets.list.path, authenticateToken, async (req: any, res) => {
    const budgets = await storage.getBudgets(req.user.id);
    res.json(budgets);
  });

  app.post(api.budgets.create.path, authenticateToken, async (req: any, res) => {
    try {
      // numeric columns from drizzle-zod expect strings; coerce numbers to strings
      const budgetBodySchema = z.object({
        category: z.string().min(1, "Category is required"),
        monthlyLimit: z.union([z.string(), z.number()]).transform(v => String(v)),
        alertThreshold: z.union([z.string(), z.number()]).transform(v => String(v)).optional().default("80"),
      });
      const input = budgetBodySchema.parse(req.body);
      const budget = await storage.createBudget({ ...input, userId: req.user.id });
      res.status(201).json(budget);
    } catch (err) {
      console.error("Budget creation error:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // ---- Subscription Routes ----
  app.get(api.subscriptions.list.path, authenticateToken, async (req: any, res) => {
    try {
      const subs = await storage.getSubscriptions(req.user.id);
      res.json(subs);
    } catch {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get(api.subscriptions.upcoming.path, authenticateToken, async (req: any, res) => {
    try {
      const upcoming = await storage.getUpcomingSubscriptions(req.user.id, 7);
      res.json(upcoming);
    } catch {
      res.status(500).json({ message: "Failed to fetch upcoming subscriptions" });
    }
  });

  app.get(api.subscriptions.summary.path, authenticateToken, async (req: any, res) => {
    try {
      const summary = await storage.getSubscriptionSummary(req.user.id);
      res.json(summary);
    } catch {
      res.status(500).json({ message: "Failed to fetch subscription summary" });
    }
  });

  app.post('/api/subscriptions/deactivate/:id', authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deactivateSubscription(id, req.user.id);
      res.json({ message: "Subscription cancelled" });
    } catch {
      res.status(500).json({ message: "Failed to deactivate subscription" });
    }
  });

  // ---- Notification Routes ----
  app.get(api.notifications.list.path, authenticateToken, async (req: any, res) => {
    try {
      const notifs = await storage.getNotifications(req.user.id);
      res.json(notifs);
    } catch {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id, req.user.id);
      res.json({ message: "Marked as read" });
    } catch {
      res.status(500).json({ message: "Failed to mark notification" });
    }
  });

  // ---- AI Advisor Route (enhanced with subscription context) ----
  app.post(api.ai.ask.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.ai.ask.input.parse(req.body);
      const summary = await storage.getTransactionSummary(req.user.id);
      const accounts = await storage.getAccounts(req.user.id);
      const subSummary = await storage.getSubscriptionSummary(req.user.id);
      const upcomingSubs = await storage.getUpcomingSubscriptions(req.user.id, 7);
      const subs = await storage.getSubscriptions(req.user.id);

      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as unknown as string), 0);

      const subNames = subs.map(s => `${s.merchantName} ($${parseFloat(s.averageAmount as unknown as string).toFixed(2)}/${s.cycle})`).join(", ");
      const upcomingNames = upcomingSubs.map(s => `${s.merchantName} on ${new Date(s.nextExpectedDate).toLocaleDateString()}`).join(", ");

      const contextStr = `User Financial Context:
Total Balance: $${totalBalance.toFixed(2)}
Spending by Category: ${JSON.stringify(summary)}
Active Subscriptions (${subSummary.activeSubscriptionCount}): ${subNames || "None"}
Monthly Subscription Spend: $${subSummary.totalMonthlySubscriptionSpend.toFixed(2)}
Upcoming Auto-Debits (next 7 days): ${upcomingNames || "None"}

You are a helpful AI Financial Advisor. Provide clear, actionable advice. Reference subscriptions when relevant.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: contextStr },
          { role: "user", content: input.prompt }
        ],
      });

      res.json({ answer: response.choices[0].message.content });
    } catch (err) {
      console.error("AI Error:", err);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // ---- Financial Health Score Route ----
  app.get(api.ai.financialHealth.path, authenticateToken, async (req: any, res) => {
    try {
      const result = await storage.getTransactions(req.user.id, { limit: 1000 });
      const txList = result.items;
      const budgets = await storage.getBudgets(req.user.id);

      const totalIncome = txList.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);
      const totalExpense = txList.filter(t => t.type === "DEBIT").reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      let savingsRateScore = 0;
      if (savingsRate > 30) savingsRateScore = 30;
      else if (savingsRate > 20) savingsRateScore = 20;
      else if (savingsRate > 10) savingsRateScore = 10;

      const categorySpending = txList.filter(t => t.type === "DEBIT").reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount as unknown as string);
        return acc;
      }, {} as Record<string, number>);

      let budgetAdherenceScore = 20;
      if (budgets.length > 0) {
        let overBudgetCount = 0;
        for (const budget of budgets) {
          const spent = categorySpending[budget.category] || 0;
          const limit = parseFloat(budget.monthlyLimit as unknown as string);
          if (spent > limit) overBudgetCount++;
        }
        if (overBudgetCount > 0) budgetAdherenceScore -= 10 * overBudgetCount;
      }

      let categoryBalanceScore = 25;
      for (const cat of ["Entertainment", "Shopping", "Subscription"]) {
        if (categorySpending[cat] && (categorySpending[cat] / totalExpense) * 100 > 25) categoryBalanceScore -= 8;
      }
      categoryBalanceScore = Math.max(0, categoryBalanceScore);

      const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
      let incomeExpenseScore = 0;
      if (incomeExpenseRatio < 50) incomeExpenseScore = 25;
      else if (incomeExpenseRatio < 70) incomeExpenseScore = 20;
      else if (incomeExpenseRatio < 90) incomeExpenseScore = 10;

      const score = Math.round(Math.min(100, savingsRateScore + budgetAdherenceScore + categoryBalanceScore + incomeExpenseScore));

      const insights: string[] = [];
      const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) insights.push(`You spend ${((topCategory[1] / totalExpense) * 100).toFixed(0)}% on ${topCategory[0]}`);
      insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%`);
      if (totalExpense > 0) insights.push(`Monthly expenses: $${totalExpense.toFixed(2)}`);

      const recommendations: string[] = [];
      if (savingsRate < 20) recommendations.push("Try to increase your savings rate to 20% or more");
      if (categorySpending["Entertainment"] && (categorySpending["Entertainment"] / totalExpense) * 100 > 20) recommendations.push("Consider reducing entertainment spending");
      if (categorySpending["Shopping"] && (categorySpending["Shopping"] / totalExpense) * 100 > 20) recommendations.push("Look for opportunities to reduce shopping expenses");
      if (categorySpending["Subscription"] && (categorySpending["Subscription"] / totalExpense) * 100 > 5) recommendations.push("Review and cancel unused subscriptions");
      if (recommendations.length === 0) recommendations.push("Keep maintaining your current spending habits!");

      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: `Financial health score ${score}/100, savings rate ${savingsRate.toFixed(1)}%. Write a 1-sentence summary of their financial status. Be honest but encouraging.` }],
        max_completion_tokens: 60,
      });
      const summary = summaryResponse.choices[0]?.message?.content || "Your financial health is on track.";

      res.json({
        score, summary, insights, recommendations,
        breakdown: { savingsRate: Math.round(savingsRate), budgetAdherence: budgetAdherenceScore, categoryBalance: categoryBalanceScore, incomeExpenseRatio: Math.round(100 - incomeExpenseRatio) },
      });
    } catch (err) {
      console.error("Financial Health Error:", err);
      res.status(500).json({ message: "Failed to calculate financial health score" });
    }
  });

  // ---- Monthly Financial Report PDF ----
  app.get(api.reports.monthlyReport.path, authenticateToken, async (req: any, res) => {
    try {
      const result = await storage.getTransactions(req.user.id, { limit: 1000 });
      const txList = result.items;
      const budgets = await storage.getBudgets(req.user.id);
      const accounts = await storage.getAccounts(req.user.id);
      const subSummary = await storage.getSubscriptionSummary(req.user.id);
      const subs = await storage.getSubscriptions(req.user.id);

      const totalIncome = txList.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);
      const totalExpense = txList.filter(t => t.type === "DEBIT").reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);
      const categorySpending = txList.filter(t => t.type === "DEBIT").reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount as unknown as string);
        return acc;
      }, {} as Record<string, number>);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as unknown as string), 0);

      let savingsRateScore = 0;
      if (savingsRate > 30) savingsRateScore = 30;
      else if (savingsRate > 20) savingsRateScore = 20;
      else if (savingsRate > 10) savingsRateScore = 10;

      let budgetAdherenceScore = 20;
      for (const budget of budgets) {
        const spent = categorySpending[budget.category] || 0;
        if (spent > parseFloat(budget.monthlyLimit as unknown as string)) budgetAdherenceScore -= 10;
      }

      let categoryBalanceScore = 25;
      for (const cat of ["Entertainment", "Shopping", "Subscription"]) {
        if (categorySpending[cat] && (categorySpending[cat] / totalExpense) * 100 > 25) categoryBalanceScore -= 8;
      }
      categoryBalanceScore = Math.max(0, categoryBalanceScore);

      const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
      let incomeExpenseScore = 0;
      if (incomeExpenseRatio < 50) incomeExpenseScore = 25;
      else if (incomeExpenseRatio < 70) incomeExpenseScore = 20;
      else if (incomeExpenseRatio < 90) incomeExpenseScore = 10;

      const healthScore = Math.round(Math.min(100, savingsRateScore + budgetAdherenceScore + categoryBalanceScore + incomeExpenseScore));

      const adviceResponse = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: `Income $${totalIncome.toFixed(2)}, expenses $${totalExpense.toFixed(2)}, savings rate ${savingsRate.toFixed(1)}%, ${subSummary.activeSubscriptionCount} subscriptions costing $${subSummary.totalMonthlySubscriptionSpend.toFixed(2)}/month. Provide 2-3 sentences of financial advice.` }],
        max_completion_tokens: 120,
      });
      const aiAdvice = adviceResponse.choices[0]?.message?.content || "Maintain consistent spending habits and review your budget monthly.";

      const PAGE_MARGIN = 50;
      const PAGE_WIDTH = 595.28; // A4
      const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
      const PRIMARY   = "#0ACDAA"; // teal accent
      const DARK_BG   = "#1A1A2E";
      const MID_GRAY  = "#4A5568";
      const LIGHT_GRAY = "#EDF2F7";
      const WHITE     = "#FFFFFF";
      const TEXT_DARK = "#1A202C";

      const doc = new PDFDocument({ bufferPages: true, margin: PAGE_MARGIN, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.contentType("application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="VaultAI_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
        res.send(pdfBuffer);
      });

      const generateDate = new Date();

      // ── Helper: draw a table ──────────────────────────────────────────────────
      function drawTable(
        headers: { label: string; width: number; align?: "left" | "right" | "center" }[],
        rows: string[][],
        startX: number,
        startY: number,
        rowHeight = 20,
        headerBg = DARK_BG,
        evenBg = LIGHT_GRAY,
        oddBg = WHITE
      ): number {
        const totalW = headers.reduce((s, h) => s + h.width, 0);

        // Header row
        doc.save();
        doc.rect(startX, startY, totalW, rowHeight + 4).fill(headerBg);
        let cx = startX;
        headers.forEach(h => {
          doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE)
            .text(h.label, cx + 4, startY + 6, { width: h.width - 8, align: h.align || "left", lineBreak: false });
          cx += h.width;
        });
        doc.restore();

        let y = startY + rowHeight + 4;

        rows.forEach((row, ri) => {
          const bg = ri % 2 === 0 ? evenBg : oddBg;
          // check page overflow
          if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            y = PAGE_MARGIN;
          }
          doc.save();
          doc.rect(startX, y, totalW, rowHeight).fill(bg);
          cx = startX;
          headers.forEach((h, ci) => {
            doc.font("Helvetica").fontSize(8.5).fillColor(TEXT_DARK)
              .text(row[ci] ?? "", cx + 4, y + 5, { width: h.width - 8, align: h.align || "left", lineBreak: false });
            cx += h.width;
          });
          // thin row border
          doc.save();
          doc.strokeColor("#CBD5E0").lineWidth(0.3)
            .rect(startX, y, totalW, rowHeight).stroke();
          doc.restore();
          doc.restore();
          y += rowHeight;
        });

        // Outer border
        doc.strokeColor(MID_GRAY).lineWidth(0.5).rect(startX, startY, totalW, y - startY).stroke();
        return y;
      }

      // ── Helper: section heading ───────────────────────────────────────────────
      function sectionHeading(title: string, y?: number): number {
        const posY = y ?? doc.y;
        if (posY + 40 > doc.page.height - PAGE_MARGIN) { doc.addPage(); }
        doc.save();
        doc.rect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 22).fill(DARK_BG);
        doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE)
          .text(title, PAGE_MARGIN + 8, doc.y + 5, { width: CONTENT_WIDTH - 16 });
        doc.restore();
        doc.moveDown(0.3);
        return doc.y;
      }

      // ── Helper: draw page footer ──────────────────────────────────────────────
      function drawFooter(pageNum: number, total: number) {
        const y = doc.page.height - 35;
        doc.save();
        doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 0.5).fill(MID_GRAY);
        doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY)
          .text("CONFIDENTIAL — For personal use only. Generated by VaultAI.", PAGE_MARGIN, y + 5, { width: CONTENT_WIDTH - 60, align: "left" })
          .text(`Page ${pageNum} of ${total}`, PAGE_MARGIN, y + 5, { width: CONTENT_WIDTH, align: "right" });
        doc.restore();
      }

      // ════════════════════════════════════════════════════════════════════════
      // PAGE 1 — COVER / HEADER
      // ════════════════════════════════════════════════════════════════════════

      // Full-width banner
      doc.rect(0, 0, PAGE_WIDTH, 90).fill(DARK_BG);

      // Logo mark — a small rounded square
      doc.save();
      doc.roundedRect(PAGE_MARGIN, 18, 36, 36, 6).fill(PRIMARY);
      doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK_BG)
        .text("V", PAGE_MARGIN + 10, 28, { lineBreak: false });
      doc.restore();

      // App name
      doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE)
        .text("Vault", PAGE_MARGIN + 44, 22, { continued: true, lineBreak: false })
        .fillColor(PRIMARY).text("AI", { lineBreak: false });

      // Tagline
      doc.font("Helvetica").fontSize(9).fillColor("#A0AEC0")
        .text("AI-Powered Personal Finance Manager", PAGE_MARGIN + 44, 48);

      // Report title (right side)
      doc.font("Helvetica-Bold").fontSize(14).fillColor(WHITE)
        .text("MONTHLY FINANCIAL REPORT", 0, 26, { align: "right", width: PAGE_WIDTH - PAGE_MARGIN - 10 });
      doc.font("Helvetica").fontSize(9).fillColor("#A0AEC0")
        .text(`Generated: ${generateDate.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}`, 0, 46, { align: "right", width: PAGE_WIDTH - PAGE_MARGIN - 10 });

      doc.y = 105;

      // ── Summary KPI cards row ─────────────────────────────────────────────
      const kpiCards = [
        { label: "Total Balance",   value: `$${totalBalance.toFixed(2)}`,             color: PRIMARY  },
        { label: "Total Income",    value: `$${totalIncome.toFixed(2)}`,              color: "#48BB78" },
        { label: "Total Expenses",  value: `$${totalExpense.toFixed(2)}`,             color: "#FC8181" },
        { label: "Net Savings",     value: `$${(totalIncome - totalExpense).toFixed(2)}`, color: "#63B3ED" },
        { label: "Savings Rate",    value: `${savingsRate.toFixed(1)}%`,              color: "#F6AD55" },
        { label: "Health Score",    value: `${healthScore}/100`,                      color: "#9F7AEA" },
      ];
      const cardW = CONTENT_WIDTH / 3;
      const cardH = 52;
      kpiCards.forEach((card, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = PAGE_MARGIN + col * cardW;
        const y = doc.y + row * (cardH + 6);
        doc.save();
        doc.roundedRect(x + 2, y, cardW - 4, cardH, 4).fill("#F7FAFC");
        doc.rect(x + 2, y, 4, cardH).fill(card.color);
        doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY).text(card.label.toUpperCase(), x + 12, y + 10, { width: cardW - 16, lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(15).fillColor(TEXT_DARK).text(card.value, x + 12, y + 24, { width: cardW - 16, lineBreak: false });
        doc.restore();
      });
      doc.y += (cardH + 6) * 2 + 14;

      // ── AI Advice banner ──────────────────────────────────────────────────
      doc.save();
      doc.roundedRect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 44, 4).fill("#EBF8FF");
      doc.rect(PAGE_MARGIN, doc.y, 4, 44).fill(PRIMARY);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(MID_GRAY).text("AI FINANCIAL ADVICE", PAGE_MARGIN + 12, doc.y + 6, { width: CONTENT_WIDTH - 20 });
      doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK).text(aiAdvice, PAGE_MARGIN + 12, doc.y + 18, { width: CONTENT_WIDTH - 20, lineBreak: false });
      doc.restore();
      doc.y += 56;

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 1 — ACCOUNT BALANCES
      // ════════════════════════════════════════════════════════════════════════
      sectionHeading("1.  ACCOUNT BALANCES");
      const accountRows = accounts.map(acc => [
        acc.accountName,
        acc.accountType,
        `$${parseFloat(acc.balance as unknown as string).toFixed(2)}`,
        acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : "—",
      ]);
      accountRows.push(["", "TOTAL", `$${totalBalance.toFixed(2)}`, ""]);
      drawTable(
        [
          { label: "Account Name", width: 170 },
          { label: "Type",         width: 100 },
          { label: "Balance",      width: 100, align: "right" },
          { label: "Created",      width: 125 },
        ],
        accountRows,
        PAGE_MARGIN, doc.y
      );
      doc.moveDown(1);

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 2 — TRANSACTION HISTORY
      // ════════════════════════════════════════════════════════════════════════
      sectionHeading("2.  TRANSACTION HISTORY");
      const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.accountName]));
      const txRows = txList.slice(0, 50).map(tx => [
        new Date(tx.date).toLocaleDateString(),
        tx.description.length > 28 ? tx.description.slice(0, 28) + "…" : tx.description,
        accountMap[tx.accountId] || "—",
        tx.category,
        tx.type === "CREDIT" ? "Income" : "Expense",
        (tx.type === "CREDIT" ? "+" : "-") + "$" + parseFloat(tx.amount as unknown as string).toFixed(2),
        tx.isRecurring ? "Yes" : "No",
      ]);
      drawTable(
        [
          { label: "Date",        width: 62  },
          { label: "Description", width: 120 },
          { label: "Account",     width: 80  },
          { label: "Category",    width: 70  },
          { label: "Type",        width: 52  },
          { label: "Amount",      width: 64, align: "right" },
          { label: "Recurring",   width: 47  },
        ],
        txRows,
        PAGE_MARGIN, doc.y, 18
      );
      if (txList.length > 50) {
        doc.moveDown(0.4);
        doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY)
          .text(`Showing 50 of ${txList.length} transactions.`, { align: "right" });
      }
      doc.moveDown(1);

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 3 — SPENDING BY CATEGORY
      // ════════════════════════════════════════════════════════════════════════
      sectionHeading("3.  SPENDING BY CATEGORY");
      const catRows = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => {
          const pct = totalExpense > 0 ? ((amount / totalExpense) * 100) : 0;
          const bar = "█".repeat(Math.round(pct / 5));
          return [cat, `$${amount.toFixed(2)}`, `${pct.toFixed(1)}%`, bar];
        });
      const catTotalRow = ["TOTAL EXPENSES", `$${totalExpense.toFixed(2)}`, "100%", ""];
      catRows.push(catTotalRow);
      drawTable(
        [
          { label: "Category",   width: 160 },
          { label: "Amount",     width: 100, align: "right" },
          { label: "% of Total", width: 80,  align: "right" },
          { label: "Visual",     width: 155 },
        ],
        catRows,
        PAGE_MARGIN, doc.y
      );
      doc.moveDown(1);

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 4 — BUDGET STATUS
      // ════════════════════════════════════════════════════════════════════════
      if (budgets.length > 0) {
        sectionHeading("4.  BUDGET STATUS");
        const budgetRows = budgets.map(b => {
          const spent = categorySpending[b.category] || 0;
          const limit = parseFloat(b.monthlyLimit as unknown as string);
          const pct = limit > 0 ? ((spent / limit) * 100).toFixed(1) : "0.0";
          const status = spent > limit ? "OVER BUDGET" : spent >= limit * 0.8 ? "NEAR LIMIT" : "ON TRACK";
          return [b.category, `$${limit.toFixed(2)}`, `$${spent.toFixed(2)}`, `${pct}%`, status];
        });
        drawTable(
          [
            { label: "Category",    width: 140 },
            { label: "Monthly Limit", width: 100, align: "right" },
            { label: "Spent",       width: 100, align: "right" },
            { label: "Used %",      width: 75,  align: "right" },
            { label: "Status",      width: 80   },
          ],
          budgetRows,
          PAGE_MARGIN, doc.y
        );
        doc.moveDown(1);
      }

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 5 — ACTIVE SUBSCRIPTIONS
      // ════════════════════════════════════════════════════════════════════════
      if (subs.length > 0) {
        sectionHeading("5.  ACTIVE SUBSCRIPTIONS");
        const subRows = subs.map(s => [
          s.merchantName,
          s.cycle.charAt(0).toUpperCase() + s.cycle.slice(1),
          `$${parseFloat(s.averageAmount as unknown as string).toFixed(2)}`,
          new Date(s.nextExpectedDate).toLocaleDateString(),
          `${Math.round(s.confidenceScore * 100)}%`,
        ]);
        const subTotalRow = [`${subs.length} active subscription(s)`, "", `$${subSummary.totalMonthlySubscriptionSpend.toFixed(2)}/mo`, "", ""];
        subRows.push(subTotalRow);
        drawTable(
          [
            { label: "Merchant",      width: 155 },
            { label: "Cycle",         width: 75  },
            { label: "Avg Amount",    width: 90, align: "right" },
            { label: "Next Expected", width: 105 },
            { label: "Confidence",    width: 70, align: "right" },
          ],
          subRows,
          PAGE_MARGIN, doc.y
        );
        doc.moveDown(1);
      }

      // ════════════════════════════════════════════════════════════════════════
      // SECTION 6 — FINANCIAL HEALTH SCORE
      // ════════════════════════════════════════════════════════════════════════
      sectionHeading(subs.length > 0 ? "6.  FINANCIAL HEALTH SCORE" : "5.  FINANCIAL HEALTH SCORE");
      const scoreRows = [
        ["Savings Rate",         `${savingsRateScore} / 30`,     savingsRate.toFixed(1) + "%",      savingsRate >= 30 ? "Excellent" : savingsRate >= 20 ? "Good" : savingsRate >= 10 ? "Fair" : "Needs Work"],
        ["Budget Adherence",     `${budgetAdherenceScore} / 20`, `${budgets.length} budgets set`,   budgetAdherenceScore >= 20 ? "On Track" : "Over Budget"],
        ["Category Balance",     `${categoryBalanceScore} / 25`, "Top category spending check",     categoryBalanceScore >= 25 ? "Balanced" : "Review Needed"],
        ["Income/Expense Ratio", `${incomeExpenseScore} / 25`,   incomeExpenseRatio.toFixed(1) + "% ratio", incomeExpenseScore >= 25 ? "Healthy" : incomeExpenseScore >= 20 ? "Good" : "Improve"],
        ["OVERALL HEALTH SCORE", `${healthScore} / 100`,         "",                                healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Work"],
      ];
      drawTable(
        [
          { label: "Metric",      width: 165 },
          { label: "Score",       width: 90, align: "right" },
          { label: "Details",     width: 160 },
          { label: "Status",      width: 80  },
        ],
        scoreRows,
        PAGE_MARGIN, doc.y
      );
      doc.moveDown(1.5);

      // ── Stamp-style report footer ─────────────────────────────────────────
      doc.save();
      doc.rect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 0.5).fill(MID_GRAY);
      doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY)
        .text(`This report was automatically generated by VaultAI on ${generateDate.toUTCString()}. All figures are based on recorded transactions and may not reflect real-time balances.`,
          PAGE_MARGIN, doc.y + 6, { width: CONTENT_WIDTH, align: "center" });
      doc.restore();

      // ── Write page footers on every page ─────────────────────────────────
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        drawFooter(i + 1, totalPages);
      }

      doc.end();
    } catch (err) {
      console.error("Report Generation Error:", err);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.post('/api/seed', async (req, res) => {
    res.json({ message: "Create accounts and transactions through the UI to get started." });
  });

  // ---- Nightly Cron Job (runs every 24h) ----
  setInterval(() => {
    runNightlyDetection().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  return httpServer;
}
