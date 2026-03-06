// Campaign execution engine — build audience, send batches via Resend/Twilio
// Used by /api/cron/send-campaigns (every 15 min)

import { Resend } from "resend";
import twilio from "twilio";
import { SupabaseClient } from "@supabase/supabase-js";
import { WARMUP_SCHEDULE } from "./campaign-types";
import { buildSegmentQuery } from "./segment-builder";
import {
  renderCampaignEmail,
  getUnsubscribeHeaders,
  getOrCreateUnsubscribeToken,
} from "./campaign-email";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.genesishvacr.com";
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@genesishvacr.com";
const SENDER_NAME = "Genesis HVAC";
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || "";

/**
 * Build audience for a campaign — creates campaign_recipients rows from segment query.
 * Called once when campaign transitions to "sending".
 */
export async function buildAudience(
  supabase: SupabaseClient,
  campaignId: string
): Promise<number> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Query customers matching segment filter
  const query = buildSegmentQuery(supabase, campaign.segment_filter || {}, campaign.type);

  // Apply exclusions — collect IDs to filter post-fetch
  let excludeIds = new Set<string>();

  if (campaign.exclude_active_pipeline) {
    const { data: activeCustomerIds } = await supabase
      .from("estimates")
      .select("customer_id")
      .in("status", ["active", "sent", "snoozed"]);

    if (activeCustomerIds && activeCustomerIds.length > 0) {
      for (const e of activeCustomerIds) {
        excludeIds.add((e as { customer_id: string }).customer_id);
      }
    }
  }

  // Fetch all matching customers (paginate in chunks of 1000)
  let allCustomers: { id: string }[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("[Campaign] Audience query error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    allCustomers = allCustomers.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // Post-fetch exclusions
  if (excludeIds.size > 0) {
    allCustomers = allCustomers.filter((c) => !excludeIds.has(c.id));
  }

  if (campaign.exclude_recent_contact_days && campaign.exclude_recent_contact_days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - campaign.exclude_recent_contact_days);
    const { data: recentIds } = await supabase
      .from("messages")
      .select("customer_id")
      .gte("created_at", cutoff.toISOString())
      .not("customer_id", "is", null);

    if (recentIds && recentIds.length > 0) {
      const excludeRecent = new Set(recentIds.map((m: { customer_id: string }) => m.customer_id).filter(Boolean));
      allCustomers = allCustomers.filter((c) => !excludeRecent.has(c.id));
    }
  }

  if (allCustomers.length === 0) {
    console.log(`[Campaign] ${campaignId}: No audience members found`);
    return 0;
  }

  // Insert campaign_recipients rows (batch insert, skip duplicates)
  const recipientRows = allCustomers.map((c) => ({
    campaign_id: campaignId,
    customer_id: c.id,
    status: "queued",
  }));

  // Insert in chunks of 500 to avoid payload limits
  const chunkSize = 500;
  for (let i = 0; i < recipientRows.length; i += chunkSize) {
    const chunk = recipientRows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("campaign_recipients")
      .upsert(chunk, { onConflict: "campaign_id,customer_id", ignoreDuplicates: true });

    if (error) {
      console.error("[Campaign] Insert recipients error:", error);
    }
  }

  // Update audience_count on campaign
  await supabase
    .from("campaigns")
    .update({ audience_count: allCustomers.length })
    .eq("id", campaignId);

  console.log(`[Campaign] ${campaignId}: Built audience of ${allCustomers.length}`);
  return allCustomers.length;
}

/**
 * Get the effective batch size, accounting for warmup mode.
 */
export function getWarmupBatchSize(warmupDay: number, configuredBatchSize: number): number {
  const warmupMax = WARMUP_SCHEDULE[warmupDay];
  if (warmupMax !== undefined) {
    return Math.min(warmupMax, configuredBatchSize);
  }
  // Past warmup schedule — use configured batch size
  return configuredBatchSize;
}

/**
 * Send one batch of a campaign. Returns number of messages sent.
 */
export async function sendBatch(
  supabase: SupabaseClient,
  campaignId: string
): Promise<{ sent: number; errors: number; done: boolean }> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, email_templates(blocks)")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { sent: 0, errors: 0, done: true };
  if (campaign.status !== "sending") return { sent: 0, errors: 0, done: true };

  // Determine batch size
  let batchSize = campaign.batch_size || 50;
  if (campaign.warmup_mode) {
    batchSize = getWarmupBatchSize(campaign.warmup_day || 0, batchSize);
  }

  // Determine next batch number
  const { data: maxBatchRow } = await supabase
    .from("campaign_recipients")
    .select("batch_number")
    .eq("campaign_id", campaignId)
    .not("batch_number", "is", null)
    .order("batch_number", { ascending: false })
    .limit(1)
    .single();

  const nextBatchNumber = (maxBatchRow?.batch_number || 0) + 1;

  // Fetch queued recipients
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, customer_id, customers(id, name, email, phone, city, do_not_contact, marketing_unsubscribed)")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .limit(batchSize);

  if (!recipients || recipients.length === 0) {
    // All done — mark campaign as sent
    await supabase
      .from("campaigns")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { sent: 0, errors: 0, done: true };
  }

  let sent = 0;
  let errors = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = ((campaign.email_templates as any)?.blocks || []) as import("./campaign-types").EmailBlock[];

  for (const recipient of recipients) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = recipient.customers as any;
    if (!customer) {
      await markSkipped(supabase, recipient.id, nextBatchNumber);
      continue;
    }

    // Re-check opt-out flags before each send
    if (customer.do_not_contact || customer.marketing_unsubscribed) {
      await markSkipped(supabase, recipient.id, nextBatchNumber);
      continue;
    }

    try {
      if (campaign.type === "email") {
        const result = await sendCampaignEmail(
          supabase, campaign, blocks, customer, recipient.id, nextBatchNumber
        );
        if (result) sent++;
        else errors++;
      } else {
        const result = await sendCampaignSms(
          campaign, customer, recipient.id, nextBatchNumber, supabase
        );
        if (result) sent++;
        else errors++;
      }
    } catch (err) {
      console.error(`[Campaign] Send error for recipient ${recipient.id}:`, err);
      await supabase
        .from("campaign_recipients")
        .update({ status: "bounced", batch_number: nextBatchNumber })
        .eq("id", recipient.id);
      errors++;
    }
  }

  // Update campaign sent_count
  const { data: currentCampaign } = await supabase
    .from("campaigns")
    .select("sent_count, bounced_count")
    .eq("id", campaignId)
    .single();

  if (currentCampaign) {
    await supabase
      .from("campaigns")
      .update({
        sent_count: (currentCampaign.sent_count || 0) + sent,
        bounced_count: (currentCampaign.bounced_count || 0) + errors,
      })
      .eq("id", campaignId);
  }

  // If warmup mode, increment warmup_day after each batch
  if (campaign.warmup_mode) {
    await supabase
      .from("campaigns")
      .update({ warmup_day: (campaign.warmup_day || 0) + 1 })
      .eq("id", campaignId);
  }

  // Check if more recipients remain
  const { count: remaining } = await supabase
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const done = (remaining || 0) === 0;
  if (done) {
    await supabase
      .from("campaigns")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
  }

  console.log(`[Campaign] ${campaignId} batch ${nextBatchNumber}: sent=${sent}, errors=${errors}, remaining=${remaining}`);
  return { sent, errors, done };
}

// --- Internal helpers ---

async function sendCampaignEmail(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any,
  blocks: import("./campaign-types").EmailBlock[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer: any,
  recipientId: string,
  batchNumber: number
): Promise<boolean> {
  if (!customer.email) {
    await markSkipped(supabase, recipientId, batchNumber);
    return false;
  }

  // Get or create unsubscribe token
  const token = await getOrCreateUnsubscribeToken(supabase, customer.id);
  const unsubscribeUrl = `${APP_URL}/unsubscribe/${token}`;

  const html = renderCampaignEmail({
    blocks,
    customerName: customer.name || "Valued Customer",
    customerEmail: customer.email,
    customerCity: customer.city || null,
    companyName: "Genesis Refrigeration & HVAC",
    unsubscribeUrl,
    previewText: campaign.preview_text || undefined,
  });

  const headers = getUnsubscribeHeaders(unsubscribeUrl);

  const { data: sendResult, error: sendError } = await resend.emails.send({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: customer.email,
    subject: campaign.subject || "Update from Genesis HVAC",
    html,
    headers,
  });

  if (sendError) {
    console.error(`[Campaign] Email send error for ${customer.email}:`, sendError);
    await supabase
      .from("campaign_recipients")
      .update({ status: "bounced", batch_number: batchNumber })
      .eq("id", recipientId);
    return false;
  }

  // Store resend message ID for webhook correlation
  await supabase
    .from("campaign_recipients")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      batch_number: batchNumber,
      resend_message_id: sendResult?.id || null,
    })
    .eq("id", recipientId);

  return true;
}

async function sendCampaignSms(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer: any,
  recipientId: string,
  batchNumber: number,
  supabase: SupabaseClient
): Promise<boolean> {
  if (!customer.phone || !TWILIO_FROM) {
    await markSkipped(supabase, recipientId, batchNumber);
    return false;
  }

  // Replace variables in SMS body
  let body = campaign.sms_body || "";
  body = body.replace(/\{\{customer_name\}\}/g, customer.name || "");
  body = body.replace(/\{\{customer_city\}\}/g, customer.city || "");
  body = body.replace(/\{\{company_name\}\}/g, "Genesis Refrigeration & HVAC");

  // Auto-append STOP language for CAN-SPAM/TCPA
  if (!body.includes("STOP")) {
    body += "\n\nReply STOP to unsubscribe.";
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: TWILIO_FROM,
      to: customer.phone,
    });

    await supabase
      .from("campaign_recipients")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        batch_number: batchNumber,
        twilio_message_sid: message.sid,
      })
      .eq("id", recipientId);

    return true;
  } catch (err) {
    console.error(`[Campaign] SMS send error for ${customer.phone}:`, err);
    await supabase
      .from("campaign_recipients")
      .update({ status: "bounced", batch_number: batchNumber })
      .eq("id", recipientId);
    return false;
  }
}

async function markSkipped(
  supabase: SupabaseClient,
  recipientId: string,
  batchNumber: number
) {
  await supabase
    .from("campaign_recipients")
    .update({ status: "skipped", batch_number: batchNumber })
    .eq("id", recipientId);
}
