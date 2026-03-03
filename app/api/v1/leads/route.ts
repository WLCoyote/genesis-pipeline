/**
 * GET /api/v1/leads
 * Open leads list. Params: status, start_date, end_date
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
    const status = url.searchParams.get("status");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    let query = supabase
      .from("leads")
      .select(`
        id, first_name, last_name, email, phone, address, city, state, zip,
        lead_source, status, notes, assigned_to, hcp_customer_id, estimate_id,
        created_at, updated_at
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    } else {
      // Default: open leads (not moved to HCP or archived)
      query = query.in("status", ["new", "contacted", "qualified"]);
    }

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data, error } = await query;
    if (error) return apiError("INTERNAL_ERROR", error.message);

    const leads = (data || []).map((lead) => ({
      id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      lead_source: lead.lead_source,
      status: lead.status,
      notes: lead.notes,
      assigned_to: lead.assigned_to,
      hcp_customer_id: lead.hcp_customer_id,
      estimate_id: lead.estimate_id,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    }));

    return apiSuccess({
      leads,
      total_count: leads.length,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
