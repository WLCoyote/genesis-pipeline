import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { handleNewEstimate, handleExistingEstimate } from "@/lib/hcp-polling";

// HCP sends a GET to verify the URL when registering
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// HMAC-SHA256 signature verification (same pattern as Resend webhook)
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Events we care about — all estimate-related
const HANDLED_EVENTS = new Set([
  "estimate.created",
  "estimate.sent",
  "estimate.updated",
  "estimate.option.approval_status_changed",
]);

export async function POST(request: NextRequest) {
  const tag = "[HCP Webhook]";

  try {
    const body = await request.text();

    // Verify HMAC signature if secret is configured
    const webhookSecret = process.env.HCP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-hcp-signature") || "";
      if (!signature || !verifySignature(body, signature, webhookSecret)) {
        console.error(`${tag} Invalid signature`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    } else {
      console.warn(`${tag} HCP_WEBHOOK_SECRET not set — skipping signature check`);
    }

    const event = JSON.parse(body);
    const eventType = event.event || event.type || "";

    // Log every event for observability (remove after first week)
    console.log(`${tag} Event: ${eventType}`, JSON.stringify(event).slice(0, 500));

    // Ignore events we don't handle
    if (!HANDLED_EVENTS.has(eventType)) {
      return NextResponse.json({ received: true });
    }

    // Extract estimate ID from payload
    // HCP webhook payloads nest data under event.data or at the top level
    const estimateId =
      event.data?.estimate_id ||
      event.data?.id ||
      event.estimate_id ||
      event.id;

    if (!estimateId) {
      console.error(`${tag} No estimate ID in payload`);
      return NextResponse.json({ received: true });
    }

    // Fetch the full estimate from HCP API (webhook payload may be partial)
    const hcpBase = process.env.HCP_API_BASE_URL;
    const hcpToken = process.env.HCP_BEARER_TOKEN;

    if (!hcpBase || !hcpToken) {
      console.error(`${tag} HCP API not configured`);
      return NextResponse.json({ received: true });
    }

    const hcpResponse = await fetch(`${hcpBase}/estimates/${estimateId}`, {
      headers: {
        Authorization: `Bearer ${hcpToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!hcpResponse.ok) {
      console.error(`${tag} Failed to fetch estimate ${estimateId}: ${hcpResponse.status}`);
      return NextResponse.json({ received: true });
    }

    const hcpEstimate = await hcpResponse.json();
    const hcpId = hcpEstimate.id as string;
    const hcpEstNumber = String(hcpEstimate.estimate_number || "");
    const hcpOptions = (hcpEstimate.options || []) as Record<string, unknown>[];

    const supabase = createServiceClient();

    // Read settings (same queries as polling)
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["auto_decline_days", "hcp_tag_filter_enabled", "hcp_exclude_tags"]);

    const settingsMap: Record<string, unknown> = {};
    for (const row of settingsRows || []) {
      settingsMap[row.key] = row.value;
    }

    const autoDeclineDays = (settingsMap.auto_decline_days as number) || 60;
    const tagFilterEnabled = settingsMap.hcp_tag_filter_enabled === true;
    const excludeTagsRaw = (settingsMap.hcp_exclude_tags as string) || "";
    const excludeTags = tagFilterEnabled
      ? excludeTagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Build user name map for employee matching
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("is_active", true);

    const userByName: Record<string, { id: string; name: string }> = {};
    for (const u of users || []) {
      if (u.name) {
        userByName[u.name.toLowerCase().trim()] = { id: u.id, name: u.name };
      }
    }

    // Check if we already have this estimate locally
    const { data: localEstimate } = await supabase
      .from("estimates")
      .select("id, status, assigned_to, customer_id, online_estimate_url, total_amount")
      .or(`hcp_estimate_id.eq.${hcpId},estimate_number.eq.${hcpEstNumber}`)
      .limit(1)
      .single();

    if (localEstimate) {
      // Existing estimate — update it
      await handleExistingEstimate(supabase, hcpEstimate, hcpOptions, localEstimate, {
        new_estimates: 0, updated: 0, won: 0, lost: 0, skipped: 0, errors: 0, pages_fetched: 0,
      });
      console.log(`${tag} Updated existing: ${hcpEstNumber}`);
    } else {
      // New estimate — create it
      const { data: defaultSequence } = await supabase
        .from("follow_up_sequences")
        .select("id")
        .eq("is_default", true)
        .limit(1)
        .single();

      await handleNewEstimate(
        supabase, hcpEstimate, hcpId, hcpEstNumber, hcpOptions,
        autoDeclineDays, defaultSequence?.id || null, userByName, excludeTags,
        { new_estimates: 0, updated: 0, won: 0, lost: 0, skipped: 0, errors: 0, pages_fetched: 0 }
      );
      console.log(`${tag} Processed new: ${hcpEstNumber}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`${tag} Error:`, error);
    // Always return 200 to prevent HCP retry storms
    return NextResponse.json({ received: true });
  }
}
