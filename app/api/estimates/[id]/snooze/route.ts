import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { snooze_until, snooze_note } = await request.json();

  if (!snooze_until || !snooze_note?.trim()) {
    return NextResponse.json(
      { error: "Both snooze_until and snooze_note are required" },
      { status: 400 }
    );
  }

  // Update estimate status to snoozed
  const { error: estError } = await supabase
    .from("estimates")
    .update({
      status: "snoozed",
      snooze_until,
      snooze_note: snooze_note.trim(),
    })
    .eq("id", id);

  if (estError) {
    return NextResponse.json({ error: estError.message }, { status: 500 });
  }

  // Pause any pending/scheduled follow-up events
  await supabase
    .from("follow_up_events")
    .update({ status: "snoozed" })
    .eq("estimate_id", id)
    .in("status", ["scheduled", "pending_review"]);

  return NextResponse.json({ success: true });
}
