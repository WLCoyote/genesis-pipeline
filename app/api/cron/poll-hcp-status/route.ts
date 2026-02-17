import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { updated: 0, won: 0, lost: 0, errors: 0 };

  // Read auto_decline_days from settings to determine how far back to poll
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_decline_days")
    .single();

  const autoDeclineDays = (setting?.value as number) || 60;

  // Calculate date range: today back to auto_decline_days ago
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - autoDeclineDays);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

  // Fetch estimates from HCP API
  // NOTE: HCP API response format may need adjustment once verified against actual API docs.
  // The endpoint and query params below follow the documented pattern from the architecture doc.
  let hcpEstimates;
  try {
    const response = await fetch(
      `${process.env.HCP_API_BASE_URL}/estimates?start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HCP_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("HCP API error:", response.status, await response.text());
      return NextResponse.json(
        { error: `HCP API returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    hcpEstimates = data.estimates || data.data || data;
    if (!Array.isArray(hcpEstimates)) {
      hcpEstimates = [hcpEstimates];
    }
  } catch (err) {
    console.error("HCP API fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from HCP" },
      { status: 502 }
    );
  }

  for (const hcpEstimate of hcpEstimates) {
    try {
      // Match to our estimate by hcp_estimate_id or estimate_number
      const { data: localEstimate } = await supabase
        .from("estimates")
        .select("id, status, assigned_to, customer_id, online_estimate_url")
        .or(
          `hcp_estimate_id.eq.${hcpEstimate.id},estimate_number.eq.${hcpEstimate.estimate_number || hcpEstimate.number}`
        )
        .limit(1)
        .single();

      if (!localEstimate) continue; // Not in our system

      // Capture the customer-facing estimate URL if HCP provides it
      const estimateUrl =
        hcpEstimate.online_estimate_url ||
        hcpEstimate.customer_url ||
        hcpEstimate.html_url ||
        hcpEstimate.url ||
        null;

      if (estimateUrl && !localEstimate.online_estimate_url) {
        await supabase
          .from("estimates")
          .update({ online_estimate_url: estimateUrl })
          .eq("id", localEstimate.id);
      }

      // Skip already-resolved estimates
      if (localEstimate.status === "won" || localEstimate.status === "lost") {
        continue;
      }

      // Get our local options for this estimate
      const { data: localOptions } = await supabase
        .from("estimate_options")
        .select("id, hcp_option_id, status")
        .eq("estimate_id", localEstimate.id);

      if (!localOptions || localOptions.length === 0) continue;

      // Compare HCP option statuses against ours
      // NOTE: Adjust field names (hcpOption.id, hcpOption.status) based on actual HCP API response
      const hcpOptions = hcpEstimate.options || hcpEstimate.line_items || [];
      let anyApproved = false;
      let allDeclined = true;
      let changed = false;

      for (const localOption of localOptions) {
        const hcpOption = hcpOptions.find(
          (o: Record<string, unknown>) =>
            String(o.id) === String(localOption.hcp_option_id)
        );

        if (!hcpOption) {
          allDeclined = false;
          continue;
        }

        const hcpStatus = (
          hcpOption.status ||
          hcpOption.approval_status ||
          ""
        )
          .toString()
          .toLowerCase();

        if (hcpStatus === "approved" && localOption.status === "pending") {
          await supabase
            .from("estimate_options")
            .update({ status: "approved" })
            .eq("id", localOption.id);
          anyApproved = true;
          changed = true;
        } else if (
          hcpStatus === "declined" &&
          localOption.status === "pending"
        ) {
          await supabase
            .from("estimate_options")
            .update({ status: "declined" })
            .eq("id", localOption.id);
          changed = true;
        } else if (localOption.status !== "declined") {
          allDeclined = false;
        }
      }

      if (!changed) continue;

      // Update parent estimate status based on option outcomes
      if (anyApproved) {
        // One option approved = estimate won, stop sequence
        await supabase
          .from("estimates")
          .update({ status: "won" })
          .eq("id", localEstimate.id);

        // Stop follow-up sequence
        await supabase
          .from("follow_up_events")
          .update({ status: "skipped" })
          .eq("estimate_id", localEstimate.id)
          .in("status", ["scheduled", "pending_review", "snoozed"]);

        if (localEstimate.assigned_to) {
          await supabase.from("notifications").insert({
            user_id: localEstimate.assigned_to,
            type: "estimate_approved",
            estimate_id: localEstimate.id,
            message: "Estimate approved by customer in Housecall Pro!",
          });
        }

        results.won++;
      } else if (allDeclined) {
        // All options declined = estimate lost
        await supabase
          .from("estimates")
          .update({ status: "lost" })
          .eq("id", localEstimate.id);

        // Stop follow-up sequence
        await supabase
          .from("follow_up_events")
          .update({ status: "skipped" })
          .eq("estimate_id", localEstimate.id)
          .in("status", ["scheduled", "pending_review", "snoozed"]);

        if (localEstimate.assigned_to) {
          await supabase.from("notifications").insert({
            user_id: localEstimate.assigned_to,
            type: "estimate_declined",
            estimate_id: localEstimate.id,
            message: "All estimate options declined in Housecall Pro.",
          });
        }

        results.lost++;
      }

      results.updated++;
    } catch (err) {
      console.error(`Error processing HCP estimate ${hcpEstimate.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
