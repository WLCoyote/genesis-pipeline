/**
 * Commission calculation library.
 * Uses service role client — server-only.
 * Pattern: follows lib/company-settings.ts
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { CommissionPeriod } from "@/lib/types";

interface PeriodBounds {
  start: string; // ISO date string
  end: string;
}

/**
 * Get the start/end dates for the current period (month/quarter/year).
 */
export function getCurrentPeriodBounds(period: CommissionPeriod): PeriodBounds {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (period) {
    case "monthly": {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case "quarterly": {
      const qStart = Math.floor(month / 3) * 3;
      const start = new Date(year, qStart, 1);
      const end = new Date(year, qStart + 3, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case "annual": {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }
}

/**
 * Sum confirmed commission amounts for a user within a period.
 */
export async function getUserPeriodRevenue(
  userId: string,
  periodStart: string
): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("commission_records")
      .select("pre_tax_revenue")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("created_at", periodStart);

    if (!data || data.length === 0) return 0;
    return data.reduce((sum, r) => sum + (r.pre_tax_revenue || 0), 0);
  } catch (err) {
    console.error("[Commission] getUserPeriodRevenue failed:", err);
    return 0;
  }
}

/**
 * Look up the commission rate for a given revenue amount.
 * Finds the active tier where revenue falls between min and max.
 */
export async function getTierRate(
  periodRevenue: number,
  period: CommissionPeriod = "monthly"
): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data: tiers } = await supabase
      .from("commission_tiers")
      .select("min_revenue, max_revenue, rate_pct")
      .eq("period", period)
      .eq("is_active", true)
      .order("min_revenue", { ascending: true });

    if (!tiers || tiers.length === 0) return 0.05; // fallback 5%

    for (const tier of tiers) {
      const inRange =
        periodRevenue >= tier.min_revenue &&
        (tier.max_revenue === null || periodRevenue <= tier.max_revenue);
      if (inRange) return tier.rate_pct / 100;
    }

    // If above all tiers, use the highest tier
    return tiers[tiers.length - 1].rate_pct / 100;
  } catch (err) {
    console.error("[Commission] getTierRate failed:", err);
    return 0.05;
  }
}

/**
 * Create an estimated commission record when a proposal is signed.
 * Called from the sign route's post-sign tasks.
 */
export async function calculateEstimated(
  estimateId: string,
  userId: string,
  subtotal: number
): Promise<{ recordId: string; estimatedAmount: number; tierRate: number } | null> {
  try {
    const supabase = createServiceClient();

    // Check if a record already exists for this estimate
    const { data: existing } = await supabase
      .from("commission_records")
      .select("id")
      .eq("estimate_id", estimateId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[Commission] Record already exists for estimate ${estimateId}`);
      return null;
    }

    // Get current period revenue to determine tier
    const bounds = getCurrentPeriodBounds("monthly");
    const periodRevenue = await getUserPeriodRevenue(userId, bounds.start);
    const tierRate = await getTierRate(periodRevenue + subtotal);

    const estimatedAmount = Math.round(subtotal * tierRate * 100) / 100;

    // Check for manager
    const { data: user } = await supabase
      .from("users")
      .select("manager_id, manager_commission_pct")
      .eq("id", userId)
      .single();

    const managerId = user?.manager_id || null;
    const managerPct = user?.manager_commission_pct || 0;
    const managerAmount = managerId && managerPct > 0
      ? Math.round(estimatedAmount * (managerPct / 100) * 100) / 100
      : null;

    const { data: record, error } = await supabase
      .from("commission_records")
      .insert({
        estimate_id: estimateId,
        user_id: userId,
        manager_id: managerId,
        tier_rate_pct: tierRate * 100,
        estimated_amount: estimatedAmount,
        manager_commission_amount: managerAmount,
        status: "estimated",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Commission] Failed to create record:", error);
      return null;
    }

    console.log(
      `[Commission] Estimated: $${estimatedAmount} (${(tierRate * 100).toFixed(1)}%) for estimate ${estimateId}`
    );

    return {
      recordId: record.id,
      estimatedAmount,
      tierRate,
    };
  } catch (err) {
    console.error("[Commission] calculateEstimated failed:", err);
    return null;
  }
}

/**
 * Confirm a commission record with actual pre-tax revenue from QBO.
 * Called by the confirm-commission cron job.
 */
export async function calculateConfirmed(
  recordId: string,
  preTaxRevenue: number
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // Fetch the record to get user_id
    const { data: record } = await supabase
      .from("commission_records")
      .select("user_id, manager_id, manager_commission_amount")
      .eq("id", recordId)
      .single();

    if (!record) return false;

    // Re-calculate with fresh tier lookup based on actual period revenue
    const bounds = getCurrentPeriodBounds("monthly");
    const periodRevenue = await getUserPeriodRevenue(record.user_id, bounds.start);
    const tierRate = await getTierRate(periodRevenue + preTaxRevenue);

    const confirmedAmount = Math.round(preTaxRevenue * tierRate * 100) / 100;

    // Recalculate manager commission if applicable
    let managerAmount: number | null = null;
    if (record.manager_id) {
      const { data: user } = await supabase
        .from("users")
        .select("manager_commission_pct")
        .eq("id", record.user_id)
        .single();

      const managerPct = user?.manager_commission_pct || 0;
      if (managerPct > 0) {
        managerAmount = Math.round(confirmedAmount * (managerPct / 100) * 100) / 100;
      }
    }

    const { error } = await supabase
      .from("commission_records")
      .update({
        pre_tax_revenue: preTaxRevenue,
        tier_rate_pct: tierRate * 100,
        confirmed_amount: confirmedAmount,
        manager_commission_amount: managerAmount,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        period_revenue_at_confirmation: periodRevenue + preTaxRevenue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) {
      console.error("[Commission] Failed to confirm record:", error);
      return false;
    }

    console.log(
      `[Commission] Confirmed: $${confirmedAmount} (${(tierRate * 100).toFixed(1)}%) for record ${recordId}`
    );

    return true;
  } catch (err) {
    console.error("[Commission] calculateConfirmed failed:", err);
    return false;
  }
}
