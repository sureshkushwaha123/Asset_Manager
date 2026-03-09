import { z } from 'zod';
import { insertUserSchema, insertAccountSchema, insertTransactionSchema, insertBudgetSchema, users, accounts, transactions, budgets } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ user: z.custom<typeof users.$inferSelect>(), token: z.string() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: insertUserSchema,
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>(), token: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  accounts: {
    list: {
      method: 'GET' as const,
      path: '/api/accounts' as const,
      responses: { 200: z.array(z.custom<typeof accounts.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/accounts' as const,
      input: insertAccountSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof accounts.$inferSelect>() }
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      input: z.object({
        type: z.enum(['DEBIT', 'CREDIT']).optional(),
        dateRange: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      }).optional(),
      responses: { 
        200: z.object({
          items: z.array(z.custom<typeof transactions.$inferSelect>()),
          total: z.number()
        })
      }
    },
    summary: {
      method: 'GET' as const,
      path: '/api/transactions/summary' as const,
      responses: { 200: z.any() } 
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema.omit({ userId: true, category: true, date: true }).extend({
        category: z.string().optional(),
        date: z.string().optional(),
      }),
      responses: { 201: z.custom<typeof transactions.$inferSelect>() }
    }
  },
  budgets: {
    list: {
      method: 'GET' as const,
      path: '/api/budgets' as const,
      responses: { 200: z.array(z.custom<typeof budgets.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/budgets' as const,
      input: insertBudgetSchema.omit({ userId: true }),
      responses: { 201: z.custom<typeof budgets.$inferSelect>() }
    }
  },
  ai: {
    ask: {
      method: 'POST' as const,
      path: '/api/ai/ask' as const,
      input: z.object({ prompt: z.string() }),
      responses: { 200: z.object({ answer: z.string() }) }
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
