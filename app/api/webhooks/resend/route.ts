import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

// Verify Resend webhook signature using the signing secret
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature if signing secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("resend-signature") || "";
      if (!signature || !verifySignature(body, signature, webhookSecret)) {
        console.error("Invalid Resend webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type;
    const eventData = event.data;

    // We only care about engagement events
    if (
      !["email.opened", "email.clicked", "email.bounced", "email.unsubscribed"].includes(
        eventType
      )
    ) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Match the event to a follow_up_event by the Resend email ID
    // Resend includes the email_id in webhook payloads
    const emailId = eventData?.email_id;
    if (!emailId) {
      return NextResponse.json({ received: true });
    }

    // Find the follow_up_event that matches this email
    // We store Resend message IDs implicitly via the sent_at timestamp correlation,
    // but a more robust approach is to store the message_id when sending.
    // For now, match by looking at recently sent email events.
    // TODO: Store resend_message_id on follow_up_events for direct matching.

    // Map Resend event types to our follow_up_events statuses
    let newStatus: string | null = null;
    let notificationType: string | null = null;

    switch (eventType) {
      case "email.opened":
        newStatus = "opened";
        notificationType = "email_opened";
        break;
      case "email.clicked":
        newStatus = "clicked";
        notificationType = "link_clicked";
        break;
      case "email.bounced":
        newStatus = "skipped"; // Treat bounces as skipped
        notificationType = null; // Don't notify on bounces for now
        break;
      case "email.unsubscribed":
        newStatus = null; // Don't change event status
        notificationType = null;
        break;
    }

    // Try to find the matching follow_up_event
    // Match by recipient email + most recent sent email event
    const recipientEmail = eventData?.to?.[0] || eventData?.to;
    if (!recipientEmail) {
      return NextResponse.json({ received: true });
    }

    // Find customer by email, then find their most recent sent email event
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", recipientEmail)
      .limit(1)
      .single();

    if (!customer) {
      return NextResponse.json({ received: true });
    }

    // Get the most recent sent email follow_up_event for this customer's estimates
    const { data: recentEvent } = await supabase
      .from("follow_up_events")
      .select("id, estimate_id, estimates (assigned_to)")
      .eq("channel", "email")
      .eq("status", "sent")
      .in(
        "estimate_id",
        (
          await supabase
            .from("estimates")
            .select("id")
            .eq("customer_id", customer.id)
        ).data?.map((e) => e.id) || []
      )
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (!recentEvent) {
      return NextResponse.json({ received: true });
    }

    // Update follow_up_event status
    if (newStatus) {
      await supabase
        .from("follow_up_events")
        .update({ status: newStatus })
        .eq("id", recentEvent.id);
    }

    // Create notification for the assigned comfort pro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignedTo = (recentEvent.estimates as any)?.assigned_to as string | null;

    if (notificationType && assignedTo) {
      const notificationMessages: Record<string, string> = {
        email_opened: `${recipientEmail} opened your follow-up email!`,
        link_clicked: `${recipientEmail} clicked a link in your follow-up email!`,
      };

      await supabase.from("notifications").insert({
        user_id: assignedTo,
        type: notificationType,
        estimate_id: recentEvent.estimate_id,
        message: notificationMessages[notificationType] || "Email engagement detected.",
      });
    }

    // Handle unsubscribe: mark customer as do_not_contact
    if (eventType === "email.unsubscribed") {
      await supabase
        .from("customers")
        .update({ do_not_contact: true })
        .eq("id", customer.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
