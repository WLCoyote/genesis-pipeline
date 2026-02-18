import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  const serviceClient = createServiceClient();

  // If marking as lost, decline pending options in HCP
  if (status === "lost") {
    const { data: options } = await serviceClient
      .from("estimate_options")
      .select("id, hcp_option_id, status")
      .eq("estimate_id", id);

    const pendingOptions = (options || []).filter((o) => o.status === "pending");
    const hcpOptionIds = pendingOptions
      .map((o) => o.hcp_option_id)
      .filter(Boolean);

    if (hcpOptionIds.length > 0) {
      try {
        const response = await fetch(
          `${process.env.HCP_API_BASE_URL}/estimates/options/decline`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HCP_BEARER_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ option_ids: hcpOptionIds }),
          }
        );

        if (!response.ok) {
          console.error(
            `HCP decline failed for estimate ${id}:`,
            response.status,
            await response.text()
          );
        }
      } catch (hcpErr) {
        console.error(`HCP API error declining estimate ${id}:`, hcpErr);
      }
    }

    // Update local options to declined
    for (const option of pendingOptions) {
      await serviceClient
        .from("estimate_options")
        .update({ status: "declined" })
        .eq("id", option.id);
    }
  }

  // Update estimate status
  const { error: estError } = await serviceClient
    .from("estimates")
    .update({ status })
    .eq("id", id);

  if (estError) {
    return NextResponse.json({ error: estError.message }, { status: 500 });
  }

  // If won or lost, skip remaining follow-up events
  if (status === "won" || status === "lost") {
    await serviceClient
      .from("follow_up_events")
      .update({ status: "skipped" })
      .eq("estimate_id", id)
      .in("status", ["scheduled", "pending_review", "snoozed"]);
  }

  return NextResponse.json({ success: true });
}
