import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const results = { declined: 0, warnings: 0, errors: 0 };

  // Read settings
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["auto_decline_days", "declining_soon_warning_days"]);

  const settingsMap = Object.fromEntries(
    (settings || []).map((s) => [s.key, s.value as number])
  );
  const warningDays = settingsMap.declining_soon_warning_days || 3;

  // =============================================
  // PHASE 1: Auto-decline estimates past threshold
  // =============================================

  const { data: expiredEstimates, error: expiredError } = await supabase
    .from("estimates")
    .select(
      `
      id, assigned_to, customer_id,
      estimate_options (id, hcp_option_id, status)
    `
    )
    .in("status", ["active", "snoozed"])
    .lte("auto_decline_date", today);

  if (expiredError) {
    console.error("Error fetching expired estimates:", expiredError);
    return NextResponse.json(
      { error: "Failed to fetch expired estimates" },
      { status: 500 }
    );
  }

  for (const estimate of expiredEstimates || []) {
    try {
      // Collect all pending option IDs for HCP API decline
      const pendingOptions = (
        estimate.estimate_options as Array<{
          id: string;
          hcp_option_id: string | null;
          status: string;
        }>
      ).filter((o) => o.status === "pending");

      const hcpOptionIds = pendingOptions
        .map((o) => o.hcp_option_id)
        .filter(Boolean);

      // POST to HCP API to decline options
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
              `HCP decline failed for estimate ${estimate.id}:`,
              response.status,
              await response.text()
            );
            // Continue with local update even if HCP fails
          }
        } catch (hcpErr) {
          console.error(
            `HCP API error declining estimate ${estimate.id}:`,
            hcpErr
          );
        }
      }

      // Update all pending options to declined locally
      for (const option of pendingOptions) {
        await supabase
          .from("estimate_options")
          .update({ status: "declined" })
          .eq("id", option.id);
      }

      // Mark estimate as lost
      await supabase
        .from("estimates")
        .update({ status: "lost" })
        .eq("id", estimate.id);

      // Notify the comfort pro
      if (estimate.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: estimate.assigned_to,
          type: "estimate_declined",
          estimate_id: estimate.id,
          message:
            "Estimate auto-declined — passed the auto-decline threshold.",
        });
      }

      results.declined++;
    } catch (err) {
      console.error(`Error auto-declining estimate ${estimate.id}:`, err);
      results.errors++;
    }
  }

  // =============================================
  // PHASE 2: Send "declining soon" warnings
  // =============================================

  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + warningDays);
  const warningDateStr = warningDate.toISOString().split("T")[0];

  const { data: warningEstimates, error: warningError } = await supabase
    .from("estimates")
    .select("id, assigned_to, customer_id, customers (name)")
    .in("status", ["active", "snoozed"])
    .gt("auto_decline_date", today)
    .lte("auto_decline_date", warningDateStr);

  if (warningError) {
    console.error("Error fetching warning estimates:", warningError);
  }

  for (const estimate of warningEstimates || []) {
    try {
      if (!estimate.assigned_to) continue;

      // Check if we already sent a declining_soon notification for this estimate
      const { data: existingWarning } = await supabase
        .from("notifications")
        .select("id")
        .eq("estimate_id", estimate.id)
        .eq("type", "declining_soon")
        .limit(1);

      if (existingWarning && existingWarning.length > 0) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerName = (estimate.customers as any)?.name || "Customer";

      await supabase.from("notifications").insert({
        user_id: estimate.assigned_to,
        type: "declining_soon",
        estimate_id: estimate.id,
        message: `Estimate for ${customerName} will auto-decline in ${warningDays} days.`,
      });

      results.warnings++;
    } catch (err) {
      console.error(`Error sending warning for estimate ${estimate.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
