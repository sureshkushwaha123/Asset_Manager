import { db } from "./db";
import { transactions, subscriptions, notifications } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText } from "./config/gemini";

const NON_SUBSCRIPTION_CATEGORIES = ["Food", "Groceries", "Fuel", "Travel"];
const MIN_OCCURRENCES = 3;
const MONTHLY_MIN_DAYS = 25;
const MONTHLY_MAX_DAYS = 35;
const AMOUNT_VARIANCE_THRESHOLD = 0.15;
const REPEAT_EXCEPTION_COUNT = 5;

function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple bigram similarity
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) bigrams.add(str.slice(i, i + 2));
    return bigrams;
  };
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);
  const intersection = [...bigrams1].filter(bg => bigrams2.has(bg)).length;
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
}

function groupSimilarMerchants(txs: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();

  for (const tx of txs) {
    const desc = tx.description;
    let matched = false;

    for (const [key, group] of groups) {
      if (stringSimilarity(desc, key) >= 0.8) {
        group.push(tx);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.set(desc, [tx]);
    }
  }

  return groups;
}

function detectCycle(sortedDates: Date[]): { cycle: string; avgInterval: number; consistency: number } | null {
  if (sortedDates.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
    intervals.push(diffMs / (1000 * 60 * 60 * 24));
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, d) => sum + Math.pow(d - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 1 - stdDev / avgInterval);

  if (avgInterval >= MONTHLY_MIN_DAYS && avgInterval <= MONTHLY_MAX_DAYS) {
    return { cycle: "monthly", avgInterval, consistency };
  } else if (avgInterval >= 6 && avgInterval <= 8) {
    return { cycle: "weekly", avgInterval, consistency };
  } else if (avgInterval >= 350 && avgInterval <= 380) {
    return { cycle: "yearly", avgInterval, consistency };
  }

  return null;
}

function calculateAmountConsistency(amounts: number[]): number {
  if (amounts.length < 2) return 1;
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const maxDeviation = Math.max(...amounts.map(a => Math.abs(a - avg) / avg));
  return maxDeviation <= AMOUNT_VARIANCE_THRESHOLD ? 1 - maxDeviation : 0;
}

function calculateConfidenceScore(
  intervalConsistency: number,
  amountConsistency: number,
  repetitions: number
): number {
  const repetitionScore = Math.min(repetitions / 6, 1);
  return Math.round((intervalConsistency * 0.4 + amountConsistency * 0.4 + repetitionScore * 0.2) * 100) / 100;
}

async function isSubscriptionMerchant(merchantName: string): Promise<boolean> {
  try {
    const answer = await generateText(
      `Is "${merchantName}" a recurring subscription service (like Netflix, Spotify, SaaS tools, gyms, insurance, etc.)? Answer only YES or NO.`
    );
    return answer.trim().toUpperCase().startsWith("YES");
  } catch {
    return true; // Default to allow if AI fails
  }
}

export async function runSubscriptionDetection(userId: number): Promise<void> {
  try {
    const debitTxs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "DEBIT")))
      .orderBy(desc(transactions.date));

    const groups = groupSimilarMerchants(debitTxs);

    for (const [merchantKey, group] of groups) {
      if (group.length < MIN_OCCURRENCES) continue;

      // Check for non-subscription categories (unless repeated > REPEAT_EXCEPTION_COUNT)
      const isNonSubCategory = NON_SUBSCRIPTION_CATEGORIES.some(cat =>
        group[0].category?.toLowerCase().includes(cat.toLowerCase())
      );
      if (isNonSubCategory && group.length <= REPEAT_EXCEPTION_COUNT) continue;

      const sorted = group.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const dates = sorted.map((t: any) => new Date(t.date));
      const amounts = sorted.map((t: any) => parseFloat(t.amount));

      const cycleInfo = detectCycle(dates);
      if (!cycleInfo) continue;

      const amountConsistency = calculateAmountConsistency(amounts);
      if (amountConsistency === 0) continue;

      // AI confirmation
      const isSubscription = await isSubscriptionMerchant(merchantKey);
      if (!isSubscription) continue;

      const confidenceScore = calculateConfidenceScore(
        cycleInfo.consistency,
        amountConsistency,
        group.length
      );

      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const lastDate = dates[dates.length - 1];
      const nextExpected = new Date(lastDate.getTime() + cycleInfo.avgInterval * 24 * 60 * 60 * 1000);

      // Mark transactions as recurring
      for (const tx of sorted) {
        await db
          .update(transactions)
          .set({
            isRecurring: true,
            recurringCycle: cycleInfo.cycle,
            nextExpectedDate: nextExpected,
            recurringConfidence: confidenceScore,
          })
          .where(eq(transactions.id, tx.id));
      }

      // Upsert into subscriptions table
      const existing = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.merchantName, merchantKey)));

      if (existing.length > 0) {
        await db
          .update(subscriptions)
          .set({
            averageAmount: avgAmount.toFixed(2),
            lastDetectedDate: lastDate,
            nextExpectedDate: nextExpected,
            confidenceScore,
            isActive: true,
          })
          .where(eq(subscriptions.id, existing[0].id));
      } else {
        await db.insert(subscriptions).values({
          userId,
          merchantName: merchantKey,
          averageAmount: avgAmount.toFixed(2),
          cycle: cycleInfo.cycle,
          lastDetectedDate: lastDate,
          nextExpectedDate: nextExpected,
          confidenceScore,
          isActive: true,
        });
      }

      // Create notification if within 3 days
      const daysUntilNext = (nextExpected.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilNext >= 0 && daysUntilNext <= 3) {
        const subRecord = await db
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.userId, userId), eq(subscriptions.merchantName, merchantKey)));

        if (subRecord.length > 0) {
          await db.insert(notifications).values({
            userId,
            message: `Upcoming auto-debit expected for ${merchantKey} — $${avgAmount.toFixed(2)}`,
            type: "subscription_alert",
            isRead: false,
            subscriptionId: subRecord[0].id,
          });
        }
      }
    }
  } catch (err) {
    console.error("[SubscriptionDetector] Error:", err);
  }
}

export async function runNightlyDetection(): Promise<void> {
  try {
    const allUsers = await db.execute<{ id: number }>("SELECT id FROM users");
    for (const user of (allUsers as any).rows ?? []) {
      await runSubscriptionDetection(user.id);
    }
    console.log("[SubscriptionDetector] Nightly detection completed");
  } catch (err) {
    console.error("[SubscriptionDetector] Nightly run error:", err);
  }
}
