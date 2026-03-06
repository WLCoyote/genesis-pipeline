import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildAudience, sendBatch } from "@/lib/campaign-sender";

// GET /api/cron/send-campaigns — runs every 15 minutes
// Finds campaigns with status = "sending", sends one batch per campaign per run
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = { campaigns: 0, sent: 0, errors: 0, completed: 0 };

  // --- Handle scheduled campaigns that are due ---
  const now = new Date().toISOString();
  const { data: scheduledCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (scheduledCampaigns) {
    for (const c of scheduledCampaigns) {
      await supabase
        .from("campaigns")
        .update({ status: "sending", started_at: now })
        .eq("id", c.id);
    }
  }

  // --- Find all campaigns currently sending ---
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, started_at, batch_interval_minutes, audience_count")
    .eq("status", "sending");

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ ...results, message: "No active campaigns" });
  }

  for (const campaign of campaigns) {
    results.campaigns++;

    // Build audience if not yet built (audience_count = 0 and no recipients exist)
    if (campaign.audience_count === 0) {
      const { count: existingRecipients } = await supabase
        .from("campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);

      if (!existingRecipients || existingRecipients === 0) {
        try {
          const audienceSize = await buildAudience(supabase, campaign.id);
          if (audienceSize === 0) {
            // No audience — mark as sent (empty)
            await supabase
              .from("campaigns")
              .update({ status: "sent", completed_at: new Date().toISOString() })
              .eq("id", campaign.id);
            results.completed++;
            continue;
          }
        } catch (err) {
          console.error(`[CampaignCron] Build audience error for ${campaign.id}:`, err);
          continue;
        }
      }
    }

    // Check batch interval: has enough time passed since last batch?
    const { data: lastSentRecipient } = await supabase
      .from("campaign_recipients")
      .select("sent_at")
      .eq("campaign_id", campaign.id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSentRecipient?.sent_at) {
      const lastSentTime = new Date(lastSentRecipient.sent_at).getTime();
      const intervalMs = (campaign.batch_interval_minutes || 60) * 60 * 1000;
      if (Date.now() - lastSentTime < intervalMs) {
        // Not enough time has passed — skip this campaign this run
        continue;
      }
    }

    // Send one batch
    try {
      const result = await sendBatch(supabase, campaign.id);
      results.sent += result.sent;
      results.errors += result.errors;
      if (result.done) results.completed++;
    } catch (err) {
      console.error(`[CampaignCron] Send batch error for ${campaign.id}:`, err);
      results.errors++;
    }
  }

  console.log(`[CampaignCron] Done:`, results);
  return NextResponse.json(results);
}
