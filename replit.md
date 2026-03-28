# VaultAI — AI-Powered Personal Finance Manager

## Overview
A full-stack personal finance management application with AI-driven insights, automatic subscription detection, financial health scoring, and a full User Profile & Settings system.

## Tech Stack
- **Frontend**: React + Vite, TanStack Query, Shadcn UI, Recharts, Wouter, Tailwind CSS
- **Backend**: Node.js + Express, Drizzle ORM, PostgreSQL
- **AI**: Google Gemini (`gemini-1.5-flash`) via `@google/generative-ai`
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **PDF**: pdfkit

## Architecture
- `shared/schema.ts` — Drizzle table definitions + Zod schemas + types
- `shared/routes.ts` — Typed API route definitions (method, path, input, responses)
- `server/routes.ts` — Express route handlers (thin controllers)
- `server/storage.ts` — Database CRUD interface (IStorage + DatabaseStorage)
- `server/subscriptionDetector.ts` — Recurring subscription detection engine
- `client/src/pages/` — Page components
- `client/src/hooks/` — React Query hooks for all API calls
- `client/src/components/` — Shared UI components

## Pages / Routes
| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Balance, income/expense stats, subscription widgets, charts |
| `/accounts` | Accounts | Create and manage financial accounts |
| `/transactions` | Transactions | Add/view transactions with recurring badge + filter |
| `/subscriptions` | Subscriptions | Auto-detected recurring charges, upcoming debits, notifications |
| `/budgets` | Budgets | Category spending limits with alerts |
| `/advisor` | AI Advisor | Gemini-powered financial chatbot |

## Key Features
- **JWT Authentication**: Login/Register with bcrypt password hashing
- **Account Management**: Create bank/savings/credit accounts
- **Transactions**: CRUD with AI auto-categorization (Gemini)
- **Subscription Detection**: Automatic pattern recognition using:
  - String similarity grouping (bigram-based)
  - Cycle detection (monthly/weekly/yearly)
  - Amount variance checking (<15%)
  - Gemini merchant validation ("Is X a subscription service?")
  - Confidence scoring (interval + amount consistency + repetitions)
- **Notifications**: Auto-generated alerts for upcoming auto-debits (within 3 days)
- **Financial Health Score**: 0-100 composite score (savings rate, budget adherence, category balance, income/expense ratio)
- **AI Advisor**: Contextual financial chatbot with subscription awareness
- **Monthly PDF Report**: Downloadable PDF with financials + subscription breakdown + AI advice
- **Nightly Cron**: Runs subscription detection for all users every 24 hours

## Database Tables
- `users` — Auth
- `accounts` — Financial accounts
- `transactions` — All transactions (with isRecurring, recurringCycle, nextExpectedDate, recurringConfidence)
- `subscriptions` — Detected recurring subscriptions
- `notifications` — User alerts for upcoming auto-debits
- `budgets` — Category spending limits

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — JWT signing secret
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL (Replit AI Integrations)

## Commands
- `npm run dev` — Start development server (port 5000)
- `npm run build` — Production build
- `npm run db:push` — Sync Drizzle schema to database
