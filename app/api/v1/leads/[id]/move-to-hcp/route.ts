/**
 * POST /api/v1/leads/[id]/move-to-hcp
 * Qualify a lead and create an HCP customer + estimate.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-envelope";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = validateApiKey(request);
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Fetch the lead
    const { data: lead, error: fetchErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !lead) {
      return apiError("NOT_FOUND", "Lead not found", 404);
    }

    if (lead.status === "moved_to_hcp") {
      return apiError("INVALID_STATE", "Lead has already been moved to HCP", 400);
    }

    // Create customer in HCP
    const hcpBase = process.env.HCP_API_BASE_URL;
    const hcpToken = process.env.HCP_BEARER_TOKEN;

    if (!hcpBase || !hcpToken) {
      return apiError("CONFIG_ERROR", "HCP API not configured", 500);
    }

    const fullName = `${lead.first_name} ${lead.last_name}`.trim();
    const address = [lead.address, lead.city, lead.state, lead.zip]
      .filter(Boolean)
      .join(", ");

    let hcpCustomerId: string | null = null;

    try {
      const hcpRes = await fetch(`${hcpBase}/customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hcpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            mobile_number: lead.phone,
            notifications_enabled: true,
            addresses: address
              ? [{ street: lead.address, city: lead.city, state: lead.state, zip: lead.zip }]
              : [],
            lead_source: lead.lead_source,
          },
        }),
      });

      if (hcpRes.ok) {
        const hcpData = await hcpRes.json();
        hcpCustomerId = hcpData.customer?.id || hcpData.id || null;
      } else {
        console.error("[MoveToHcp] HCP customer create failed:", hcpRes.status, await hcpRes.text());
      }
    } catch (hcpErr) {
      console.error("[MoveToHcp] HCP API error:", hcpErr);
    }

    // Create local customer
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        name: fullName,
        email: lead.email,
        phone: lead.phone,
        address: address || null,
        hcp_customer_id: hcpCustomerId,
        lead_source: lead.lead_source,
      })
      .select("id")
      .single();

    if (custErr) return apiError("INTERNAL_ERROR", custErr.message);

    // Update lead status
    await supabase
      .from("leads")
      .update({
        status: "moved_to_hcp",
        hcp_customer_id: hcpCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return apiSuccess({
      lead_id: id,
      customer_id: customer.id,
      hcp_customer_id: hcpCustomerId,
      status: "moved_to_hcp",
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
