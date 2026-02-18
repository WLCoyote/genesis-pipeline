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

  const body = await request.json();
  const { status, action, selected_option_ids } = body;

  // Legacy path: simple status change (reactivate)
  if (status === "active") {
    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from("estimates")
      .update({ status: "active" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // New path: won/lost with option selection
  if (action === "won" || action === "lost") {
    const serviceClient = createServiceClient();
    const selectedIds = (selected_option_ids || []) as string[];

    // Fetch all options for this estimate
    const { data: allOptions } = await serviceClient
      .from("estimate_options")
      .select("id, hcp_option_id, status")
      .eq("estimate_id", id);

    if (!allOptions) {
      return NextResponse.json({ error: "No options found" }, { status: 404 });
    }

    if (action === "won") {
      // Selected options → approved (local only, customer signs in HCP)
      for (const opt of allOptions) {
        if (selectedIds.includes(opt.id)) {
          await serviceClient
            .from("estimate_options")
            .update({ status: "approved" })
            .eq("id", opt.id);
        } else if (opt.status === "pending") {
          // Remaining pending options → declined in HCP
          await serviceClient
            .from("estimate_options")
            .update({ status: "declined" })
            .eq("id", opt.id);
        }
      }

      // Decline non-selected pending options in HCP
      const toDeclineInHcp = allOptions
        .filter((o) => !selectedIds.includes(o.id) && o.status === "pending" && o.hcp_option_id)
        .map((o) => o.hcp_option_id);

      if (toDeclineInHcp.length > 0) {
        await declineInHcp(id, toDeclineInHcp as string[]);
      }

      // Mark estimate as won
      await serviceClient
        .from("estimates")
        .update({ status: "won" })
        .eq("id", id);
    } else {
      // action === "lost"
      // Selected options → declined in HCP
      const toDeclineInHcp = allOptions
        .filter((o) => selectedIds.includes(o.id) && o.hcp_option_id)
        .map((o) => o.hcp_option_id);

      if (toDeclineInHcp.length > 0) {
        await declineInHcp(id, toDeclineInHcp as string[]);
      }

      for (const opt of allOptions) {
        if (selectedIds.includes(opt.id)) {
          await serviceClient
            .from("estimate_options")
            .update({ status: "declined" })
            .eq("id", opt.id);
        }
      }

      // Check if all options are now declined
      const { data: remaining } = await serviceClient
        .from("estimate_options")
        .select("id")
        .eq("estimate_id", id)
        .eq("status", "pending");

      if (!remaining || remaining.length === 0) {
        // All declined → mark estimate as lost
        await serviceClient
          .from("estimates")
          .update({ status: "lost" })
          .eq("id", id);
      }
    }

    // Skip remaining follow-up events if estimate is now terminal
    const { data: est } = await serviceClient
      .from("estimates")
      .select("status")
      .eq("id", id)
      .single();

    if (est?.status === "won" || est?.status === "lost") {
      await serviceClient
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", id)
        .in("status", ["scheduled", "pending_review", "snoozed"]);
    }

    return NextResponse.json({ success: true, estimate_status: est?.status });
  }

  // Fallback: old format with just { status: "won" | "lost" }
  if (status === "won" || status === "lost") {
    const serviceClient = createServiceClient();

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
        await declineInHcp(id, hcpOptionIds as string[]);
      }

      for (const option of pendingOptions) {
        await serviceClient
          .from("estimate_options")
          .update({ status: "declined" })
          .eq("id", option.id);
      }
    }

    const { error: estError } = await serviceClient
      .from("estimates")
      .update({ status })
      .eq("id", id);

    if (estError) {
      return NextResponse.json({ error: estError.message }, { status: 500 });
    }

    if (status === "won" || status === "lost") {
      await serviceClient
        .from("follow_up_events")
        .update({ status: "skipped" })
        .eq("estimate_id", id)
        .in("status", ["scheduled", "pending_review", "snoozed"]);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

async function declineInHcp(estimateId: string, hcpOptionIds: string[]) {
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
        `HCP decline failed for estimate ${estimateId}:`,
        response.status,
        await response.text()
      );
    }
  } catch (hcpErr) {
    console.error(`HCP API error declining estimate ${estimateId}:`, hcpErr);
  }
}
