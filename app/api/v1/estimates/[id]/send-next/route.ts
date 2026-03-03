/**
 * POST /api/v1/estimates/[id]/send-next
 * Send the next sequence step immediately for an estimate.
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

    // Fetch estimate with sequence info
    const { data: estimate, error: fetchErr } = await supabase
      .from("estimates")
      .select("id, status, sequence_id, sequence_step_index")
      .eq("id", id)
      .single();

    if (fetchErr || !estimate) {
      return apiError("NOT_FOUND", "Estimate not found", 404);
    }

    if (["won", "lost", "dormant"].includes(estimate.status)) {
      return apiError("INVALID_STATE", `Cannot send step for a ${estimate.status} estimate`, 400);
    }

    if (!estimate.sequence_id) {
      return apiError("INVALID_STATE", "Estimate has no assigned sequence", 400);
    }

    // Fetch the sequence to get steps
    const { data: sequence } = await supabase
      .from("follow_up_sequences")
      .select("steps")
      .eq("id", estimate.sequence_id)
      .single();

    const steps = (sequence?.steps as Array<{ day_offset: number; channel: string; template: string }>) || [];
    const nextStepIdx = estimate.sequence_step_index;

    if (nextStepIdx >= steps.length) {
      return apiError("INVALID_STATE", "All sequence steps have been completed", 400);
    }

    const step = steps[nextStepIdx];

    // Create a follow-up event for immediate execution
    const now = new Date().toISOString();
    const { data: event, error: insertErr } = await supabase
      .from("follow_up_events")
      .insert({
        estimate_id: id,
        sequence_step_index: nextStepIdx,
        channel: step.channel,
        status: "scheduled",
        scheduled_at: now,
        content: step.template,
      })
      .select("id")
      .single();

    if (insertErr) return apiError("INTERNAL_ERROR", insertErr.message);

    // Advance the step index
    await supabase
      .from("estimates")
      .update({ sequence_step_index: nextStepIdx + 1 })
      .eq("id", id);

    return apiSuccess({
      id,
      event_id: event?.id,
      step_index: nextStepIdx,
      channel: step.channel,
      scheduled_at: now,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
