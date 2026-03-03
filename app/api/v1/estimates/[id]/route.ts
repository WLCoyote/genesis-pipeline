/**
 * GET /api/v1/estimates/[id]
 * Full estimate detail with options, engagement, sequence state, customer contact.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-envelope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = validateApiKey(request);
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: estimate, error } = await supabase
      .from("estimates")
      .select(`
        id, estimate_number, status, total_amount, subtotal, tax_rate, tax_amount,
        sent_date, snooze_until, snooze_note, auto_decline_date,
        proposal_token, proposal_sent_at, proposal_signed_at, proposal_signed_name,
        proposal_pdf_url, selected_financing_plan_id, payment_schedule_type,
        sequence_id, sequence_step_index, created_at, updated_at,
        customers ( id, name, email, phone, address ),
        users!estimates_assigned_to_fkey ( id, name, email ),
        estimate_options ( id, option_number, description, amount, status ),
        estimate_line_items ( id, option_group, display_name, quantity, unit_price, line_total, is_addon, is_selected ),
        follow_up_events ( id, sequence_step_index, channel, status, scheduled_at, sent_at ),
        proposal_engagement ( id, event_type, option_group, session_seconds, occurred_at )
      `)
      .eq("id", id)
      .single();

    if (error || !estimate) {
      return apiError("NOT_FOUND", "Estimate not found", 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = estimate.customers as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rep = estimate.users as any;

    return apiSuccess({
      id: estimate.id,
      hcp_job_number: estimate.estimate_number,
      status: estimate.status,
      total_amount: estimate.total_amount,
      subtotal: estimate.subtotal,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      } : null,
      assigned_to: rep ? {
        id: rep.id,
        name: rep.name,
        email: rep.email,
      } : null,
      dates: {
        sent_date: estimate.sent_date,
        auto_decline_date: estimate.auto_decline_date,
        proposal_sent_at: estimate.proposal_sent_at,
        proposal_signed_at: estimate.proposal_signed_at,
        created_at: estimate.created_at,
        updated_at: estimate.updated_at,
      },
      snooze: {
        snooze_until: estimate.snooze_until,
        snooze_note: estimate.snooze_note,
      },
      proposal: {
        token: estimate.proposal_token,
        signed_name: estimate.proposal_signed_name,
        pdf_url: estimate.proposal_pdf_url,
        financing_plan_id: estimate.selected_financing_plan_id,
        payment_schedule_type: estimate.payment_schedule_type,
      },
      sequence: {
        sequence_id: estimate.sequence_id,
        current_step_index: estimate.sequence_step_index,
      },
      options: estimate.estimate_options || [],
      line_items: estimate.estimate_line_items || [],
      follow_up_events: estimate.follow_up_events || [],
      engagement: estimate.proposal_engagement || [],
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
