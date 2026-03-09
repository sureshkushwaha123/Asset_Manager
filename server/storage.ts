import { db } from "./db";
import { 
  users, accounts, transactions, budgets,
  type User, type InsertUser,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type Budget, type InsertBudget
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAccounts(userId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  
  getTransactions(userId: number, filters?: { type?: string, limit?: number, offset?: number }): Promise<{ items: Transaction[], total: number }>;
  getTransactionSummary(userId: number): Promise<any>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  getBudgets(userId: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
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

  async getAccounts(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async getTransactions(userId: number, filters?: { type?: string, limit?: number, offset?: number }): Promise<{ items: Transaction[], total: number }> {
    let query = db.select().from(transactions).where(eq(transactions.userId, userId));
    
    if (filters?.type) {
      query = db.select().from(transactions).where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, filters.type)
      ));
    }
    
    // Simplistic total count for now
    const allItems = await query;
    const total = allItems.length;

    let paginatedQuery = query.orderBy(desc(transactions.date));
    
    if (filters?.limit) {
      paginatedQuery = paginatedQuery.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      paginatedQuery = paginatedQuery.offset(filters.offset) as any;
    }
    
    const items = await paginatedQuery;
    return { items, total };
  }

  async getTransactionSummary(userId: number): Promise<any> {
    const result = await db.select({
      category: transactions.category,
      total: sql<number>`sum(${transactions.amount})`
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'DEBIT')))
    .groupBy(transactions.category);
    
    return result;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    
    // Update account balance
    const [account] = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId));
    if (account) {
      const amount = parseFloat(transaction.amount as unknown as string);
      const currentBalance = parseFloat(account.balance as unknown as string);
      const newBalance = transaction.type === 'CREDIT' 
        ? currentBalance + amount 
        : currentBalance - amount;
        
      await db.update(accounts)
        .set({ balance: newBalance.toString() })
        .where(eq(accounts.id, account.id));
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
}

export const storage = new DatabaseStorage();
