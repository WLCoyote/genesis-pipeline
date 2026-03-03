/**
 * GET /api/v1/estimates/stats
 * Pipeline statistics: value, count by status, close rate, avg days to close, commission MTD.
 * Params: start_date, end_date
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
    const url = request.nextUrl;
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    // Pipeline value + counts by status
    let query = supabase
      .from("estimates")
      .select("id, status, total_amount, sent_date, proposal_signed_at, created_at");

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: estimates, error } = await query;
    if (error) return apiError("INTERNAL_ERROR", error.message);

    const all = estimates || [];
    const active = all.filter((e) => !["draft", "won", "lost", "dormant"].includes(e.status));
    const won = all.filter((e) => e.status === "won");
    const lost = all.filter((e) => e.status === "lost");
    const terminal = won.length + lost.length;

    const pipelineValue = active.reduce((sum, e) => sum + (e.total_amount || 0), 0);

    // Close rate
    const closeRate = terminal > 0 ? Math.round((won.length / terminal) * 100) : 0;

    // Avg days to close (won estimates with both sent_date and proposal_signed_at)
    const daysToClose = won
      .filter((e) => e.sent_date && e.proposal_signed_at)
      .map((e) => {
        const sent = new Date(e.sent_date!).getTime();
        const signed = new Date(e.proposal_signed_at!).getTime();
        return (signed - sent) / (1000 * 60 * 60 * 24);
      });

    const avgDaysToClose = daysToClose.length > 0
      ? Math.round(daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length)
      : null;

    // Commission MTD
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: commissionData } = await supabase
      .from("commission_records")
      .select("estimated_amount, confirmed_amount, status")
      .gte("created_at", monthStart);

    const commissionMtd = {
      estimated: (commissionData || []).reduce((sum, r) => sum + r.estimated_amount, 0),
      confirmed: (commissionData || [])
        .filter((r) => r.status === "confirmed")
        .reduce((sum, r) => sum + (r.confirmed_amount || 0), 0),
    };

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const e of all) {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }

    return apiSuccess({
      pipeline_value: Math.round(pipelineValue * 100) / 100,
      total_count: all.length,
      status_counts: statusCounts,
      close_rate_pct: closeRate,
      avg_days_to_close: avgDaysToClose,
      commission_mtd: commissionMtd,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
