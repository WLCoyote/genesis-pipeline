/**
 * GET /api/v1/estimates/stale
 * Estimates with no activity in 5+ days.
 * Returns: customer_name, hcp_job_number, days_since_activity, sequence step.
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
    const minDays = parseInt(url.searchParams.get("min_days") || "5");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - minDays);
    const cutoffIso = cutoff.toISOString();

    // Fetch active/snoozed estimates not contacted recently
    const { data: estimates, error } = await supabase
      .from("estimates")
      .select(`
        id, estimate_number, status, total_amount,
        sent_date, updated_at, sequence_step_index,
        customers ( name, email, phone ),
        users!estimates_assigned_to_fkey ( name, email )
      `)
      .in("status", ["active", "snoozed", "sent"])
      .lte("updated_at", cutoffIso)
      .order("updated_at", { ascending: true });

    if (error) return apiError("INTERNAL_ERROR", error.message);

    const now = Date.now();
    const results = (estimates || []).map((e) => {
      const lastActivity = new Date(e.updated_at).getTime();
      const daysSince = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = e.customers as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rep = e.users as any;

      return {
        id: e.id,
        hcp_job_number: e.estimate_number,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        assigned_to: rep?.email || null,
        assigned_to_name: rep?.name || null,
        status: e.status,
        total_amount: e.total_amount,
        days_since_activity: daysSince,
        sequence_step_index: e.sequence_step_index,
        last_activity_at: e.updated_at,
      };
    });

    return apiSuccess({
      estimates: results,
      total_count: results.length,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
