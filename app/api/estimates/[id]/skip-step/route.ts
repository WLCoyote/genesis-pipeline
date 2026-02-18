import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch estimate with sequence
  const { data: estimate, error } = await serviceClient
    .from("estimates")
    .select(
      `
      id, status, sequence_step_index,
      follow_up_sequences (steps)
    `
    )
    .eq("id", id)
    .single();

  if (error || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const est = estimate as any;

  if (est.status !== "active") {
    return NextResponse.json(
      { error: "Estimate is not active" },
      { status: 400 }
    );
  }

  const steps = est.follow_up_sequences?.steps as Array<{
    day_offset: number;
    channel: string;
    is_call_task: boolean;
  }>;

  if (!steps || !Array.isArray(steps)) {
    return NextResponse.json(
      { error: "No sequence assigned" },
      { status: 400 }
    );
  }

  const stepIndex = est.sequence_step_index;
  if (stepIndex >= steps.length) {
    return NextResponse.json(
      { error: "Sequence already complete" },
      { status: 400 }
    );
  }

  const step = steps[stepIndex];

  // Check if a pending_review or scheduled event exists for this step
  const { data: existingEvent } = await serviceClient
    .from("follow_up_events")
    .select("id, status")
    .eq("estimate_id", id)
    .eq("sequence_step_index", stepIndex)
    .in("status", ["pending_review", "scheduled"])
    .limit(1)
    .single();

  if (existingEvent) {
    // Mark existing event as skipped
    await serviceClient
      .from("follow_up_events")
      .update({ status: "skipped" })
      .eq("id", existingEvent.id);
  } else {
    // Insert a new skipped event
    await serviceClient.from("follow_up_events").insert({
      estimate_id: id,
      sequence_step_index: stepIndex,
      channel: step.channel,
      status: "skipped",
      content: "Manually skipped",
    });
  }

  // Advance step index
  await serviceClient
    .from("estimates")
    .update({ sequence_step_index: stepIndex + 1 })
    .eq("id", id);

  return NextResponse.json({
    success: true,
    skipped_step: stepIndex,
    new_step_index: stepIndex + 1,
  });
}
