/**
 * POST /api/v1/estimates/[id]/status
 * Mark an estimate as won or lost.
 * Body: { action: "won" | "lost", selected_option_ids?: string[] }
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
    const body = await request.json();
    const action = body.action;
    const selectedOptionIds: string[] = body.selected_option_ids || [];

    if (!["won", "lost"].includes(action)) {
      return apiError("VALIDATION_ERROR", "action must be 'won' or 'lost'", 400);
    }

    const supabase = createServiceClient();

    // Verify estimate exists
    const { data: estimate, error: fetchErr } = await supabase
      .from("estimates")
      .select(`
        id, status, assigned_to, sequence_id, estimate_number,
        customers ( name ),
        estimate_options ( id, hcp_option_id, status )
      `)
      .eq("id", id)
      .single();

    if (fetchErr || !estimate) {
      return apiError("NOT_FOUND", "Estimate not found", 404);
    }

    if (["won", "lost"].includes(estimate.status)) {
      return apiError("INVALID_STATE", `Estimate is already ${estimate.status}`, 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (estimate.estimate_options || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = estimate.customers as any;

    if (action === "won" && selectedOptionIds.length > 0) {
      // Approve selected options
      for (const optId of selectedOptionIds) {
        await supabase
          .from("estimate_options")
          .update({ status: "approved" })
          .eq("id", optId);
      }

      // Decline non-selected pending options
      const selectedSet = new Set(selectedOptionIds);
      const toDecline = options.filter(
        (o: { id: string; status: string }) => !selectedSet.has(o.id) && o.status === "pending"
      );
      for (const opt of toDecline) {
        await supabase
          .from("estimate_options")
          .update({ status: "declined" })
          .eq("id", opt.id);
      }
    }

    if (action === "lost") {
      // Decline selected options (or all pending if none specified)
      const idsToDecline = selectedOptionIds.length > 0
        ? selectedOptionIds
        : options.filter((o: { status: string }) => o.status === "pending").map((o: { id: string }) => o.id);

      for (const optId of idsToDecline) {
        await supabase
          .from("estimate_options")
          .update({ status: "declined" })
          .eq("id", optId);
      }
    }

    // Update estimate status
    await supabase
      .from("estimates")
      .update({ status: action })
      .eq("id", id);

    // Skip remaining follow-up events
    if (estimate.sequence_id) {
      await supabase
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", id)
        .in("status", ["scheduled", "pending_review"]);
    }

    return apiSuccess({
      id,
      status: action,
      customer_name: customer?.name || null,
      estimate_number: estimate.estimate_number,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
