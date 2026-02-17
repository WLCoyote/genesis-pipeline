import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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

  const { status } = await request.json();

  if (!["won", "lost", "active"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be won, lost, or active" },
      { status: 400 }
    );
  }

  // Update estimate status
  const { error: estError } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", id);

  if (estError) {
    return NextResponse.json({ error: estError.message }, { status: 500 });
  }

  // If won or lost, skip remaining follow-up events
  if (status === "won" || status === "lost") {
    await supabase
      .from("follow_up_events")
      .update({ status: "skipped" })
      .eq("estimate_id", id)
      .in("status", ["scheduled", "pending_review", "snoozed"]);
  }

  return NextResponse.json({ success: true });
}
