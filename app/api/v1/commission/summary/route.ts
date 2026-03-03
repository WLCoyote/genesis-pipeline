/**
 * GET /api/v1/commission/summary
 * Per-rep commission breakdown: estimated/confirmed totals, tier rate, revenue to next tier.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-envelope";

export async function GET(request: NextRequest) {
  const authErr = validateApiKey(request);
  if (authErr) return authErr;

  try {
    const supabase = createServiceClient();

    // Get current month bounds
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch all active reps
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("role", ["admin", "comfort_pro"])
      .eq("is_active", true);

    // Fetch all commission records for current month
    const { data: records, error } = await supabase
      .from("commission_records")
      .select("user_id, estimated_amount, confirmed_amount, tier_rate_pct, status")
      .gte("created_at", monthStart);

    if (error) return apiError("INTERNAL_ERROR", error.message);

    // Fetch commission tiers for "revenue to next tier" calc
    const { data: tiers } = await supabase
      .from("commission_tiers")
      .select("min_revenue, max_revenue, rate_pct")
      .eq("period", "monthly")
      .eq("is_active", true)
      .order("min_revenue", { ascending: true });

    // Group by user
    const userMap = new Map<string, {
      name: string;
      email: string;
      role: string;
      estimated_total: number;
      confirmed_total: number;
      record_count: number;
      current_tier_rate: number;
    }>();

    for (const user of users || []) {
      userMap.set(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
        estimated_total: 0,
        confirmed_total: 0,
        record_count: 0,
        current_tier_rate: 0,
      });
    }

    for (const record of records || []) {
      const user = userMap.get(record.user_id);
      if (!user) continue;
      user.estimated_total += record.estimated_amount;
      user.confirmed_total += record.confirmed_amount || 0;
      user.record_count++;
      user.current_tier_rate = record.tier_rate_pct;
    }

    // Calculate revenue to next tier for each user
    const summary = Array.from(userMap.entries()).map(([userId, user]) => {
      let revenueToNextTier: number | null = null;
      let nextTierRate: number | null = null;

      if (tiers && tiers.length > 0) {
        const revenue = user.estimated_total;
        for (const tier of tiers) {
          if (tier.max_revenue !== null && revenue < tier.max_revenue) {
            // Current tier found — next tier starts at max_revenue
            const nextTier = tiers.find((t) => t.min_revenue === tier.max_revenue! + 0.01 || t.min_revenue > tier.max_revenue!);
            if (nextTier) {
              revenueToNextTier = Math.max(0, nextTier.min_revenue - revenue);
              nextTierRate = nextTier.rate_pct;
            }
            break;
          }
        }
      }

      return {
        user_id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        estimated_total: Math.round(user.estimated_total * 100) / 100,
        confirmed_total: Math.round(user.confirmed_total * 100) / 100,
        record_count: user.record_count,
        current_tier_rate: user.current_tier_rate,
        revenue_to_next_tier: revenueToNextTier != null ? Math.round(revenueToNextTier * 100) / 100 : null,
        next_tier_rate: nextTierRate,
      };
    });

    return apiSuccess({
      period: "monthly",
      period_start: monthStart,
      reps: summary.filter((s) => s.record_count > 0 || s.role === "comfort_pro"),
      total_count: summary.length,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
