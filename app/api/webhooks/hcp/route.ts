import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { handleNewEstimate, handleExistingEstimate } from "@/lib/hcp-polling";
import { calculateConfirmed } from "@/lib/commission";
import { sendEstimateNotifications } from "@/lib/notifications";
import { fireWebhookEvent } from "@/lib/webhooks";

// HCP sends a GET to verify the URL when registering
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// HMAC-SHA256 signature verification
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

// All events we subscribe to in HCP
const HANDLED_EVENTS = new Set([
  "customer.updated",
  "customer.deleted",
  "estimate.created",
  "estimate.completed",
  "estimate.sent",
  "estimate.updated",
  "estimate.option.approval_status_changed",
  "estimate.option.created",
  "estimate.copy_to_job",
  "job.paid",
]);

// Fetch a resource from the HCP API
async function hcpFetch(path: string): Promise<Record<string, unknown> | null> {
  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;
  if (!hcpBase || !hcpToken) return null;

  const res = await fetch(`${hcpBase}${path}`, {
    headers: {
      Authorization: `Bearer ${hcpToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error(`[HCP Webhook] HCP API ${path} returned ${res.status}`);
    return null;
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  const tag = "[HCP Webhook]";

  try {
    const body = await request.text();

    // HCP sends {"foo":"bar"} as a connectivity test when saving the webhook URL
    const parsed = JSON.parse(body);
    if (parsed.foo === "bar") {
      console.log(`${tag} HCP test ping — OK`);
      return NextResponse.json({ received: true });
    }

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

    const event = parsed;
    const eventType: string = event.event || event.type || "";

    console.log(`${tag} Event: ${eventType}`);

    if (!HANDLED_EVENTS.has(eventType)) {
      return NextResponse.json({ received: true });
    }

    // Return 200 immediately — process the event in the background.
    // HCP disables webhooks if it doesn't get a 2xx within 5 seconds,
    // and our handlers make multiple network calls (HCP API + Supabase).
    after(async () => {
      try {
        if (eventType === "estimate.created") {
          console.log(`${tag} estimate.created — logged only (no import)`);
          return;
        }

        if (eventType === "customer.updated") {
          await handleCustomerUpdated(event);
          return;
        }

        if (eventType === "customer.deleted") {
          await handleCustomerDeleted(event);
          return;
        }

        if (eventType === "estimate.copy_to_job") {
          await handleCopyToJob(event);
          return;
        }

        if (eventType === "job.paid") {
          await handleJobPaid(event);
          return;
        }

        // estimate.completed, estimate.sent, estimate.updated,
        // estimate.option.approval_status_changed, estimate.option.created
        await handleEstimateEvent(event, eventType);
      } catch (err) {
        console.error(`${tag} after() error processing ${eventType}:`, err);
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`${tag} Error:`, error);
    // Always return 200 to prevent HCP retry storms
    return NextResponse.json({ received: true });
  }
}

// ---------------------------------------------------------------------------
// Estimate events (completed, sent, updated, option.*)
// ---------------------------------------------------------------------------

async function handleEstimateEvent(
  event: Record<string, unknown>,
  eventType: string
) {
  const tag = "[HCP Webhook]";

  // HCP payload: { event, estimate: { id, ... }, ... }
  const estimateId =
    (event.estimate as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.estimate_id ||
    (event.data as Record<string, unknown>)?.id ||
    event.estimate_id ||
    event.id;

  if (!estimateId) {
    console.error(`${tag} No estimate ID in payload for ${eventType}`, JSON.stringify(event).slice(0, 300));
    return;
  }

  const hcpEstimate = await hcpFetch(`/estimates/${estimateId}`);
  if (!hcpEstimate) return;

  const hcpId = hcpEstimate.id as string;
  const hcpEstNumber = String(hcpEstimate.estimate_number || "");
  const hcpOptions = (hcpEstimate.options || []) as Record<string, unknown>[];

  const supabase = createServiceClient();

  // Read settings
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

  // Check if estimate exists locally
  const { data: localEstimate } = await supabase
    .from("estimates")
    .select("id, status, assigned_to, customer_id, online_estimate_url, total_amount")
    .or(`hcp_estimate_id.eq.${hcpId},estimate_number.eq.${hcpEstNumber}`)
    .limit(1)
    .single();

  if (localEstimate) {
    await handleExistingEstimate(supabase, hcpEstimate, hcpOptions, localEstimate, {
      new_estimates: 0, updated: 0, won: 0, lost: 0, skipped: 0, errors: 0, pages_fetched: 0,
    });
    console.log(`${tag} Updated existing: ${hcpEstNumber}`);
  } else {
    // estimate.updated and option events for unknown estimates → skip
    // estimate.completed and estimate.sent → import
    if (eventType !== "estimate.completed" && eventType !== "estimate.sent") {
      console.log(`${tag} ${eventType} for unknown estimate ${hcpEstNumber} — skipped`);
      return;
    }

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
}

// ---------------------------------------------------------------------------
// customer.updated — fetch from HCP → update local customer
// ---------------------------------------------------------------------------

async function handleCustomerUpdated(event: Record<string, unknown>) {
  const tag = "[HCP Webhook]";

  // HCP payload: { event, customer: { id, ... }, ... }
  const customerId =
    (event.customer as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.customer_id ||
    (event.data as Record<string, unknown>)?.id ||
    event.customer_id ||
    event.id;

  if (!customerId) {
    console.error(`${tag} No customer ID in customer.updated payload`);
    return;
  }

  const hcpCustomer = await hcpFetch(`/customers/${customerId}`);
  if (!hcpCustomer) return;

  const supabase = createServiceClient();

  const fullName = [hcpCustomer.first_name, hcpCustomer.last_name]
    .filter(Boolean)
    .join(" ");
  const customerName =
    (hcpCustomer.company as string) || fullName || "Unknown";

  // Build address from HCP customer addresses array
  let customerAddress: string | null = null;
  const addresses = (hcpCustomer.addresses || []) as Record<string, unknown>[];
  if (addresses.length > 0) {
    const addr = addresses[0];
    const parts: string[] = [];
    if (addr.street) parts.push(addr.street as string);
    if (addr.street_line_2) parts.push(addr.street_line_2 as string);
    const cityStateZip = [
      addr.city,
      addr.state ? `${addr.state} ${addr.zip || ""}`.trim() : addr.zip,
    ].filter(Boolean).join(", ");
    if (cityStateZip) parts.push(cityStateZip);
    if (parts.length > 0) customerAddress = parts.join(", ");
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name: customerName,
      ...(hcpCustomer.email ? { email: hcpCustomer.email } : {}),
      ...(hcpCustomer.mobile_number ? { phone: hcpCustomer.mobile_number } : {}),
      ...(customerAddress ? { address: customerAddress } : {}),
    })
    .eq("hcp_customer_id", customerId);

  if (error) {
    console.error(`${tag} Failed to update customer ${customerId}:`, error);
  } else {
    console.log(`${tag} customer.updated: ${customerName}`);
  }
}

// ---------------------------------------------------------------------------
// customer.deleted — mark do_not_contact, cancel active follow-ups
// ---------------------------------------------------------------------------

async function handleCustomerDeleted(event: Record<string, unknown>) {
  const tag = "[HCP Webhook]";

  // HCP payload: { event, customer: { id, ... }, ... }
  const customerId =
    (event.customer as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.customer_id ||
    (event.data as Record<string, unknown>)?.id ||
    event.customer_id ||
    event.id;

  if (!customerId) {
    console.error(`${tag} No customer ID in customer.deleted payload`);
    return;
  }

  const supabase = createServiceClient();

  // Find local customer
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("hcp_customer_id", customerId)
    .single();

  if (!customer) {
    console.log(`${tag} customer.deleted: no local customer for HCP ID ${customerId}`);
    return;
  }

  // Mark do_not_contact
  await supabase
    .from("customers")
    .update({ do_not_contact: true })
    .eq("id", customer.id);

  // Cancel active follow-up events for all estimates belonging to this customer
  const { data: estimates } = await supabase
    .from("estimates")
    .select("id")
    .eq("customer_id", customer.id);

  if (estimates && estimates.length > 0) {
    const estimateIds = estimates.map((e) => e.id);
    await supabase
      .from("follow_up_events")
      .update({ status: "skipped" })
      .in("estimate_id", estimateIds)
      .in("status", ["scheduled", "pending_review", "snoozed"]);
  }

  console.log(`${tag} customer.deleted: marked do_not_contact, cancelled follow-ups`);
}

// ---------------------------------------------------------------------------
// estimate.copy_to_job — store hcp_job_id on estimate
// ---------------------------------------------------------------------------

async function handleCopyToJob(event: Record<string, unknown>) {
  const tag = "[HCP Webhook]";

  // HCP payload: { event, estimate: { id, ... }, job: { id, ... }, ... }
  const estimateId =
    (event.estimate as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.estimate_id;
  const jobId =
    (event.job as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.job_id;

  if (!estimateId || !jobId) {
    console.error(`${tag} Missing estimate_id or job_id in copy_to_job payload`, JSON.stringify(event).slice(0, 300));
    return;
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("estimates")
    .update({ hcp_job_id: String(jobId) })
    .or(`hcp_estimate_id.eq.${estimateId},estimate_number.eq.${estimateId}`);

  if (error) {
    console.error(`${tag} Failed to store hcp_job_id for estimate ${estimateId}:`, error);
  } else {
    console.log(`${tag} estimate.copy_to_job: linked job ${jobId} to estimate ${estimateId}`);
  }
}

// ---------------------------------------------------------------------------
// job.paid — find linked estimate → confirm commission
// ---------------------------------------------------------------------------

async function handleJobPaid(event: Record<string, unknown>) {
  const tag = "[HCP Webhook]";

  // HCP payload: { event, job: { id, ... }, ... }
  const jobId =
    (event.job as Record<string, unknown>)?.id ||
    (event.data as Record<string, unknown>)?.job_id ||
    (event.data as Record<string, unknown>)?.id;

  if (!jobId) {
    console.error(`${tag} No job ID in job.paid payload`, JSON.stringify(event).slice(0, 300));
    return;
  }

  // Fetch full job from HCP to get original_estimate_id and amounts
  const hcpJob = await hcpFetch(`/jobs/${jobId}`);
  if (!hcpJob) return;

  const originalEstimateId =
    (hcpJob.original_estimate_id as string) ||
    (hcpJob.estimate_id as string) ||
    null;

  if (!originalEstimateId) {
    console.log(`${tag} job.paid: job ${jobId} has no linked estimate — skipped`);
    return;
  }

  const supabase = createServiceClient();

  // Find local estimate by HCP estimate ID
  const { data: localEstimate } = await supabase
    .from("estimates")
    .select("id, estimate_number, assigned_to, customer_id, customers(name)")
    .or(`hcp_estimate_id.eq.${originalEstimateId},hcp_job_id.eq.${jobId}`)
    .limit(1)
    .single();

  if (!localEstimate) {
    console.log(`${tag} job.paid: no local estimate for HCP estimate ${originalEstimateId}`);
    return;
  }

  // Extract payment amount — HCP job amounts are in cents
  const totalAmount = (hcpJob.total_amount as number) || 0;
  const paidAmount = totalAmount / 100;

  // Update estimate with payment info
  await supabase
    .from("estimates")
    .update({
      hcp_job_id: String(jobId),
      job_paid_at: new Date().toISOString(),
      job_paid_amount: paidAmount,
    })
    .eq("id", localEstimate.id);

  console.log(`${tag} job.paid: $${paidAmount} for estimate ${localEstimate.estimate_number}`);

  // Confirm commission if there's an estimated record
  const { data: commissionRecords } = await supabase
    .from("commission_records")
    .select("id, user_id")
    .eq("estimate_id", localEstimate.id)
    .eq("status", "estimated");

  if (!commissionRecords || commissionRecords.length === 0) {
    console.log(`${tag} job.paid: no estimated commission records for estimate ${localEstimate.id}`);
    return;
  }

  for (const record of commissionRecords) {
    const confirmed = await calculateConfirmed(record.id, paidAmount);

    if (confirmed) {
      // Fire webhook (same pattern as confirm-commission cron)
      fireWebhookEvent({
        event: "commission.confirmed",
        data: {
          record_id: record.id,
          estimate_id: localEstimate.id,
          estimate_number: localEstimate.estimate_number,
          pre_tax_revenue: paidAmount,
          source: "hcp_webhook",
        },
      });

      // Send notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerName = (localEstimate as any).customers?.name || "Customer";

      try {
        await sendEstimateNotifications(
          {
            type: "commission_confirmed",
            estimateId: localEstimate.id,
            estimateNumber: localEstimate.estimate_number || "",
            customerName,
            message: `Commission confirmed for ${customerName} — ${localEstimate.estimate_number}`,
            amount: paidAmount,
          },
          record.user_id
        );
      } catch (notifyErr) {
        console.error(`${tag} Commission notification failed:`, notifyErr);
      }
    }
  }
}
