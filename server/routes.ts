import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import OpenAI from "openai";

const JWT_SECRET = process.env.SESSION_SECRET || "fallback_secret_for_dev";

// Initialize OpenAI using Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Middleware to authenticate JWT
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ---- Auth Routes ----
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword
      });

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.status(200).json({ user, token });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
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
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // ---- Transactions Routes ----
  app.get(api.transactions.list.path, authenticateToken, async (req: any, res) => {
    try {
      const { type, page, limit } = req.query;
      const filters: any = {};
      if (type) filters.type = type;
      
      const limitNum = limit ? parseInt(limit as string) : 50;
      const pageNum = page ? parseInt(page as string) : 1;
      filters.limit = limitNum;
      filters.offset = (pageNum - 1) * limitNum;

      const result = await storage.getTransactions(req.user.id, filters);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.transactions.summary.path, authenticateToken, async (req: any, res) => {
    const summary = await storage.getTransactionSummary(req.user.id);
    res.json(summary);
  });

  app.post(api.transactions.create.path, authenticateToken, async (req: any, res) => {
    try {
      // Create schema with string coercion for IDs to support form inputs
      const requestSchema = api.transactions.create.input.extend({
        accountId: z.coerce.number(),
        amount: z.string().or(z.number()).transform(v => String(v)),
      });
      const input = requestSchema.parse(req.body);
      
      let category = input.category;
      
      // Auto-categorize using AI if no category provided
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
        } catch (error) {
          console.error("AI categorization failed", error);
          category = "Other";
        }
      }

      const transaction = await storage.createTransaction({
        ...input,
        userId: req.user.id,
        category: category!,
        date: input.date ? new Date(input.date) : new Date()
      });
      res.status(201).json(transaction);
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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
      const input = api.budgets.create.input.parse(req.body);
      const budget = await storage.createBudget({ ...input, userId: req.user.id });
      res.status(201).json(budget);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // ---- AI Advisor Route ----
  app.post(api.ai.ask.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.ai.ask.input.parse(req.body);
      
      // Get user's context (transactions summary)
      const summary = await storage.getTransactionSummary(req.user.id);
      const accounts = await storage.getAccounts(req.user.id);
      
      const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as unknown as string), 0);
      
      const contextStr = `User Financial Context:
Total Balance: $${totalBalance}
Spending by Category: ${JSON.stringify(summary)}

You are a helpful AI Financial Advisor. Provide clear, concise, and helpful advice based on this context.`;

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
      const transactions = result.items;
      const budgets = await storage.getBudgets(req.user.id);

      // Calculate metrics
      const totalIncome = transactions
        .filter(t => t.type === "CREDIT")
        .reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);

      const totalExpense = transactions
        .filter(t => t.type === "DEBIT")
        .reduce((sum, t) => sum + parseFloat(t.amount as unknown as string), 0);

      // 1. Savings Rate Score (max 30 points)
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      let savingsRateScore = 0;
      if (savingsRate > 30) savingsRateScore = 30;
      else if (savingsRate > 20) savingsRateScore = 20;
      else if (savingsRate > 10) savingsRateScore = 10;

      // 2. Budget Adherence Score (max 20 points)
      let budgetAdherenceScore = 20;
      if (budgets.length > 0) {
        const categorySpending = transactions
          .filter(t => t.type === "DEBIT")
          .reduce((acc, t) => {
            const cat = t.category;
            acc[cat] = (acc[cat] || 0) + parseFloat(t.amount as unknown as string);
            return acc;
          }, {} as Record<string, number>);

        let overBudgetCount = 0;
        for (const budget of budgets) {
          const spent = categorySpending[budget.category] || 0;
          const limit = parseFloat(budget.monthlyLimit as unknown as string);
          if (spent > limit) overBudgetCount++;
        }

        if (overBudgetCount > 0) budgetAdherenceScore -= 10 * overBudgetCount;
      }

      // 3. Category Balance Score (max 25 points)
      const categorySpending = transactions
        .filter(t => t.type === "DEBIT")
        .reduce((acc, t) => {
          const cat = t.category;
          acc[cat] = (acc[cat] || 0) + parseFloat(t.amount as unknown as string);
          return acc;
        }, {} as Record<string, number>);

      let categoryBalanceScore = 25;
      const problematicCategories = ["Entertainment", "Shopping", "Subscription"];
      for (const cat of problematicCategories) {
        if (categorySpending[cat]) {
          const percentage = (categorySpending[cat] / totalExpense) * 100;
          if (percentage > 25) categoryBalanceScore -= 8;
        }
      }
      categoryBalanceScore = Math.max(0, categoryBalanceScore);

      // 4. Income/Expense Ratio Score (max 25 points)
      const incomeExpenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
      let incomeExpenseScore = 0;
      if (incomeExpenseRatio < 50) incomeExpenseScore = 25;
      else if (incomeExpenseRatio < 70) incomeExpenseScore = 20;
      else if (incomeExpenseRatio < 90) incomeExpenseScore = 10;

      // Calculate total score
      const score = Math.round(
        Math.min(100, savingsRateScore + budgetAdherenceScore + categoryBalanceScore + incomeExpenseScore)
      );

      // Generate insights
      const insights: string[] = [];
      const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        const percentage = ((topCategory[1] / totalExpense) * 100).toFixed(0);
        insights.push(`You spend ${percentage}% on ${topCategory[0]}`);
      }
      insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%`);
      if (totalExpense > 0) {
        insights.push(`Monthly expenses: $${totalExpense.toFixed(2)}`);
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (savingsRate < 20) recommendations.push("Try to increase your savings rate to 20% or more");
      if (categorySpending["Entertainment"] && (categorySpending["Entertainment"] / totalExpense) * 100 > 20) {
        recommendations.push("Consider reducing entertainment spending");
      }
      if (categorySpending["Shopping"] && (categorySpending["Shopping"] / totalExpense) * 100 > 20) {
        recommendations.push("Look for opportunities to reduce shopping expenses");
      }
      if (categorySpending["Subscription"] && (categorySpending["Subscription"] / totalExpense) * 100 > 5) {
        recommendations.push("Review and cancel unused subscriptions");
      }
      if (recommendations.length === 0) {
        recommendations.push("Keep maintaining your current spending habits!");
      }

      // Generate summary using OpenAI
      const summaryPrompt = `Based on a financial health score of ${score}/100 with savings rate of ${savingsRate.toFixed(1)}%, please write a 1-sentence summary of their financial health status. Be encouraging but honest.`;
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: summaryPrompt }],
        max_completion_tokens: 50,
      });
      const summary = summaryResponse.choices[0]?.message?.content || "Your financial health is on track.";

      res.json({
        score,
        summary,
        insights,
        recommendations,
        breakdown: {
          savingsRate: Math.round(savingsRate),
          budgetAdherence: budgetAdherenceScore,
          categoryBalance: categoryBalanceScore,
          incomeExpenseRatio: Math.round(100 - incomeExpenseRatio),
        },
      });
    } catch (err) {
      console.error("Financial Health Error:", err);
      res.status(500).json({ message: "Failed to calculate financial health score" });
    }
  });

  // Basic seed function if requested (not heavily needed here but good to have)
  app.post('/api/seed', async (req, res) => {
    // Hidden seed endpoint for demo purposes
    res.json({ message: "To seed, create a user and add transactions manually through the UI" });
  });

  return httpServer;
}
