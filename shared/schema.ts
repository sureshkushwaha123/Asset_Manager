import { pgTable, text, serial, integer, numeric, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("ROLE_USER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  lastLoginAt: timestamp("last_login_at"),
  savingsTargetPercent: integer("savings_target_percent").default(20).notNull(),
  riskAppetite: text("risk_appetite").default("MEDIUM").notNull(),
  defaultCurrency: text("default_currency").default("INR").notNull(),
  notificationBudget: boolean("notification_budget").default(true).notNull(),
  notificationSubscription: boolean("notification_subscription").default(true).notNull(),
  notificationAI: boolean("notification_ai").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  device: text("device"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountName: text("account_name").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  accountType: text("account_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // DEBIT, CREDIT
  category: text("category").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  // Recurring fields
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringCycle: text("recurring_cycle"), // monthly, weekly, yearly
  nextExpectedDate: timestamp("next_expected_date"),
  recurringConfidence: real("recurring_confidence").default(0).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  merchantName: text("merchant_name").notNull(),
  averageAmount: numeric("average_amount", { precision: 12, scale: 2 }).notNull(),
  cycle: text("cycle").notNull(), // monthly, weekly, yearly
  lastDetectedDate: timestamp("last_detected_date").notNull(),
  nextExpectedDate: timestamp("next_expected_date").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("subscription_alert"),
  isRead: boolean("is_read").default(false).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 2 }).notNull(),
  alertThreshold: numeric("alert_threshold", { precision: 12, scale: 2 }).default("80").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertUserActivitySchema = createInsertSchema(userActivity).omit({ id: true, createdAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
