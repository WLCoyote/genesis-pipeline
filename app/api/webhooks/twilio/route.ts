import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Validate Twilio request signature
    const signature = request.headers.get("x-twilio-signature") || "";
    const url = request.url;
    const body = await request.text();
    const params = Object.fromEntries(new URLSearchParams(body));

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      params
    );

    if (!isValid) {
      console.error("Invalid Twilio signature");
      return new NextResponse("<Response></Response>", {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const fromNumber = params.From;
    const messageBody = params.Body;
    const messageSid = params.MessageSid;
    const messageStatus = params.MessageStatus;

    // Handle Twilio status callbacks (delivery reports for campaign SMS)
    if (messageStatus && params.MessageSid && !messageBody) {
      await handleSmsStatusCallback(params);
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (!fromNumber || !messageBody) {
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const supabase = createServiceClient();

    // Normalize phone number for matching (strip +1 prefix for US numbers)
    const normalizedPhone = fromNumber.replace(/^\+1/, "").replace(/\D/g, "");

    // Match incoming number to a customer
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone")
      .or(
        `phone.eq.${fromNumber},phone.eq.${normalizedPhone},phone.eq.+1${normalizedPhone}`
      );

    const customer = customers?.[0] || null;

    // Handle STOP/UNSUBSCRIBE keywords — set marketing_unsubscribed
    const stopKeywords = ["stop", "unsubscribe", "cancel", "end", "quit"];
    if (customer && stopKeywords.includes(messageBody.trim().toLowerCase())) {
      await supabase
        .from("customers")
        .update({ marketing_unsubscribed: true })
        .eq("id", customer.id);

      // Update any queued campaign recipients for this customer
      await supabase
        .from("campaign_recipients")
        .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
        .eq("customer_id", customer.id)
        .eq("status", "queued");

      console.log(`[Twilio] STOP from ${fromNumber} — customer ${customer.id} unsubscribed`);
    }

    // Find active estimate for this customer
    let estimateId: string | null = null;
    let assignedTo: string | null = null;

    if (customer) {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("id, assigned_to")
        .eq("customer_id", customer.id)
        .in("status", ["active", "snoozed"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (estimates?.[0]) {
        estimateId = estimates[0].id;
        assignedTo = estimates[0].assigned_to;
      }
    }

    // Store the inbound message
    const { error: msgError } = await supabase.from("messages").insert({
      customer_id: customer?.id || null,
      estimate_id: estimateId,
      direction: "inbound",
      channel: "sms",
      body: messageBody,
      twilio_message_sid: messageSid,
      phone_number: fromNumber,
      sent_by: null,
    });

    if (msgError) {
      console.error("Failed to store inbound message:", msgError);
    }

    // Notify the assigned comfort pro
    const customerName = customer?.name || fromNumber;
    const preview = messageBody.substring(0, 80);
    const notifiedUserIds = new Set<string>();

    if (assignedTo) {
      await supabase.from("notifications").insert({
        user_id: assignedTo,
        type: "sms_received",
        estimate_id: estimateId,
        message: `New SMS from ${customerName}: "${preview}"`,
      });
      notifiedUserIds.add(assignedTo);
    }

    // Always notify admins and CSRs (skip if already notified above)
    const { data: staffUsers } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "csr"])
      .eq("is_active", true);

    if (staffUsers && staffUsers.length > 0) {
      const staffNotifications = staffUsers
        .filter((u) => !notifiedUserIds.has(u.id))
        .map((u) => ({
          user_id: u.id,
          type: customer ? "sms_received" : "unmatched_sms",
          estimate_id: estimateId,
          message: customer
            ? `New SMS from ${customerName}: "${preview}"`
            : `Unmatched SMS from ${fromNumber}: "${preview}"`,
        }));

      if (staffNotifications.length > 0) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert(staffNotifications);

        if (notifError) {
          console.error("Failed to create SMS notifications:", notifError);
        }
      }
    }

    // Return empty TwiML so Twilio doesn't retry
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new NextResponse("<Response></Response>", {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

/**
 * Handle Twilio status callback — update campaign_recipients delivery status.
 * Twilio sends: queued, sent, delivered, undelivered, failed
 */
async function handleSmsStatusCallback(params: Record<string, string>) {
  const { MessageSid, MessageStatus } = params;
  if (!MessageSid || !MessageStatus) return;

  const supabase = createServiceClient();

  // Find campaign recipient by twilio_message_sid
  const { data: recipient } = await supabase
    .from("campaign_recipients")
    .select("id, campaign_id, status")
    .eq("twilio_message_sid", MessageSid)
    .single();

  if (!recipient) return; // Not a campaign SMS

  if (MessageStatus === "delivered") {
    // Already marked as "sent" — delivered is just confirmation
    return;
  }

  if (MessageStatus === "failed" || MessageStatus === "undelivered") {
    await supabase
      .from("campaign_recipients")
      .update({ status: "bounced" })
      .eq("id", recipient.id);

    // Increment campaign bounced_count (decrement sent_count since it was counted)
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("bounced_count, sent_count")
      .eq("id", recipient.campaign_id)
      .single();

    if (campaign) {
      await supabase
        .from("campaigns")
        .update({
          bounced_count: (campaign.bounced_count || 0) + 1,
          sent_count: Math.max(0, (campaign.sent_count || 0) - 1),
        })
        .eq("id", recipient.campaign_id);
    }

    console.log(`[Twilio] SMS ${MessageSid} ${MessageStatus} — recipient ${recipient.id} bounced`);
  }
}
