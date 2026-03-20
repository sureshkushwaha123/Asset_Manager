import { db } from "./db";
import {
  users, accounts, transactions, budgets, subscriptions, notifications, userActivity, passwordResets,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type Budget, type InsertBudget,
  type Subscription, type InsertSubscription,
  type Notification, type InsertNotification,
  type UserActivity,
} from "@shared/schema";
import { eq, and, desc, sql, lte, gte, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, data: { fullName?: string; avatarUrl?: string; defaultCurrency?: string }): Promise<User>;
  updateUserPreferences(id: number, data: { savingsTargetPercent?: number; riskAppetite?: string }): Promise<User>;
  updateUserNotifications(id: number, data: { notificationBudget?: boolean; notificationSubscription?: boolean; notificationAI?: boolean }): Promise<User>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
  softDeleteUser(id: number): Promise<void>;
  logActivity(userId: number, action: string, ipAddress?: string, device?: string): Promise<void>;
  getUserActivity(userId: number): Promise<UserActivity[]>;

  // Password Resets
  invalidatePreviousResetTokens(userId: number): Promise<void>;
  createPasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findValidPasswordReset(tokenHash: string): Promise<{ id: number; userId: number } | undefined>;
  markPasswordResetUsed(id: number): Promise<void>;

  getAccounts(userId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;

  getTransactions(userId: number, filters?: { type?: string; recurring?: boolean; limit?: number; offset?: number }): Promise<{ items: Transaction[]; total: number }>;
  getTransactionSummary(userId: number): Promise<any>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  getBudgets(userId: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;

  // Subscriptions
  getSubscriptions(userId: number): Promise<Subscription[]>;
  getUpcomingSubscriptions(userId: number, withinDays?: number): Promise<Subscription[]>;
  getSubscriptionSummary(userId: number): Promise<{ totalMonthlySubscriptionSpend: number; activeSubscriptionCount: number }>;
  deactivateSubscription(id: number, userId: number): Promise<void>;
  upsertSubscription(data: Omit<InsertSubscription, never>): Promise<Subscription>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: number, data: { fullName?: string; avatarUrl?: string; defaultCurrency?: string }): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPreferences(id: number, data: { savingsTargetPercent?: number; riskAppetite?: string }): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserNotifications(id: number, data: { notificationBudget?: boolean; notificationSubscription?: boolean; notificationAI?: boolean }): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async updateLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async softDeleteUser(id: number): Promise<void> {
    await db.update(users).set({ isDeleted: true }).where(eq(users.id, id));
  }

  async logActivity(userId: number, action: string, ipAddress?: string, device?: string): Promise<void> {
    await db.insert(userActivity).values({ userId, action, ipAddress, device });
  }

  async getUserActivity(userId: number): Promise<UserActivity[]> {
    return await db.select().from(userActivity).where(eq(userActivity.userId, userId)).orderBy(desc(userActivity.createdAt)).limit(20);
  }

  async invalidatePreviousResetTokens(userId: number): Promise<void> {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.userId, userId));
  }

  async createPasswordReset(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResets).values({ userId, tokenHash, expiresAt });
  }

  async findValidPasswordReset(tokenHash: string): Promise<{ id: number; userId: number } | undefined> {
    const now = new Date();
    const [row] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          eq(passwordResets.used, false),
          gt(passwordResets.expiresAt, now)
        )
      );
    return row ? { id: row.id, userId: row.userId } : undefined;
  }

  async markPasswordResetUsed(id: number): Promise<void> {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.id, id));
  }

  async getAccounts(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async getTransactions(
    userId: number,
    filters?: { type?: string; recurring?: boolean; limit?: number; offset?: number }
  ): Promise<{ items: Transaction[]; total: number }> {
    const conditions = [eq(transactions.userId, userId)];
    if (filters?.type) conditions.push(eq(transactions.type, filters.type));
    if (filters?.recurring !== undefined) conditions.push(eq(transactions.isRecurring, filters.recurring));

    const allItems = await db.select().from(transactions).where(and(...conditions));
    const total = allItems.length;

    let paginatedQuery: any = db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    if (filters?.limit) paginatedQuery = paginatedQuery.limit(filters.limit);
    if (filters?.offset) paginatedQuery = paginatedQuery.offset(filters.offset);

    const items = await paginatedQuery;
    return { items, total };
  }

  async getTransactionSummary(userId: number): Promise<any> {
    return await db
      .select({
        category: transactions.category,
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "DEBIT")))
      .groupBy(transactions.category);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();

    // Update account balance
    const [account] = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId));
    if (account) {
      const amount = parseFloat(transaction.amount as unknown as string);
      const currentBalance = parseFloat(account.balance as unknown as string);
      const newBalance = transaction.type === "CREDIT" ? currentBalance + amount : currentBalance - amount;
      await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, account.id));
    }

    return newTransaction;
  }

  async getBudgets(userId: number): Promise<Budget[]> {
    return await db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }

  // ---- Subscriptions ----

  async getSubscriptions(userId: number): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.isActive, true)))
      .orderBy(desc(subscriptions.confidenceScore));
  }

  async getUpcomingSubscriptions(userId: number, withinDays = 7): Promise<Subscription[]> {
    const now = new Date();
    const future = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.isActive, true),
          gte(subscriptions.nextExpectedDate, now),
          lte(subscriptions.nextExpectedDate, future)
        )
      )
      .orderBy(subscriptions.nextExpectedDate);
  }

  async getSubscriptionSummary(userId: number): Promise<{ totalMonthlySubscriptionSpend: number; activeSubscriptionCount: number }> {
    const subs = await this.getSubscriptions(userId);
    let totalMonthlySubscriptionSpend = 0;
    for (const sub of subs) {
      const amt = parseFloat(sub.averageAmount as unknown as string);
      if (sub.cycle === "monthly") totalMonthlySubscriptionSpend += amt;
      else if (sub.cycle === "weekly") totalMonthlySubscriptionSpend += amt * 4.33;
      else if (sub.cycle === "yearly") totalMonthlySubscriptionSpend += amt / 12;
    }
    return {
      totalMonthlySubscriptionSpend: Math.round(totalMonthlySubscriptionSpend * 100) / 100,
      activeSubscriptionCount: subs.length,
    };
  }

  async deactivateSubscription(id: number, userId: number): Promise<void> {
    await db
      .update(subscriptions)
      .set({ isActive: false })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  }

  async upsertSubscription(data: InsertSubscription): Promise<Subscription> {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, data.userId), eq(subscriptions.merchantName, data.merchantName)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(subscriptions)
        .set(data)
        .where(eq(subscriptions.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(subscriptions).values(data).returning();
    return created;
  }

  // ---- Notifications ----

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number, userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
