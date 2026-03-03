/**
 * POST /api/v1/estimates/[id]/snooze
 * Snooze an estimate's follow-up sequence.
 * Body: { days, note }
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
    const days = body.days;
    const note = body.note || "";

    if (!days || typeof days !== "number" || days < 1) {
      return apiError("VALIDATION_ERROR", "days must be a positive number", 400);
    }

    const supabase = createServiceClient();

    // Verify estimate exists
    const { data: estimate, error: fetchErr } = await supabase
      .from("estimates")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchErr || !estimate) {
      return apiError("NOT_FOUND", "Estimate not found", 404);
    }

    if (["won", "lost", "dormant"].includes(estimate.status)) {
      return apiError("INVALID_STATE", `Cannot snooze a ${estimate.status} estimate`, 400);
    }

    // Calculate snooze_until
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    // Update estimate
    const { error: updateErr } = await supabase
      .from("estimates")
      .update({
        status: "snoozed",
        snooze_until: snoozeUntil.toISOString(),
        snooze_note: note,
      })
      .eq("id", id);

    if (updateErr) return apiError("INTERNAL_ERROR", updateErr.message);

    // Pause pending follow-up events
    await supabase
      .from("follow_up_events")
      .update({ status: "snoozed" })
      .eq("estimate_id", id)
      .in("status", ["scheduled", "pending_review"]);

    return apiSuccess({
      id,
      status: "snoozed",
      snooze_until: snoozeUntil.toISOString(),
      snooze_note: note,
    });
  } catch (err) {
    return apiError("INTERNAL_ERROR", err instanceof Error ? err.message : "Unknown error");
  }
}
