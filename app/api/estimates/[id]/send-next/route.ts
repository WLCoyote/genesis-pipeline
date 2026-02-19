import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch estimate with sequence and customer
  const { data: estimate, error } = await serviceClient
    .from("estimates")
    .select(
      `
      id, status, sent_date, sequence_step_index, sequence_id, assigned_to,
      online_estimate_url,
      customers (id, name, email, phone),
      users!estimates_assigned_to_fkey (name),
      follow_up_sequences (steps)
    `
    )
    .eq("id", id)
    .single();

  if (error || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const est = estimate as any;

  if (est.status !== "active") {
    return NextResponse.json(
      { error: "Estimate is not active" },
      { status: 400 }
    );
  }

  const steps = est.follow_up_sequences?.steps as Array<{
    day_offset: number;
    channel: string;
    template: string;
    is_call_task: boolean;
  }>;

  if (!steps || !Array.isArray(steps)) {
    return NextResponse.json(
      { error: "No sequence assigned" },
      { status: 400 }
    );
  }

  const stepIndex = est.sequence_step_index;
  if (stepIndex >= steps.length) {
    return NextResponse.json(
      { error: "Sequence already complete" },
      { status: 400 }
    );
  }

  const step = steps[stepIndex];

  // Verify step is due (day_offset reached)
  const sentDate = new Date(est.sent_date);
  const dueDate = new Date(sentDate);
  dueDate.setDate(dueDate.getDate() + step.day_offset);
  const now = new Date();

  if (dueDate > now) {
    return NextResponse.json(
      { error: "Step is not due yet" },
      { status: 400 }
    );
  }

  // Check no existing event for this step
  const { data: existing } = await serviceClient
    .from("follow_up_events")
    .select("id")
    .eq("estimate_id", id)
    .eq("sequence_step_index", stepIndex)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "Step already scheduled or sent" },
      { status: 400 }
    );
  }

  // Replace template placeholders
  const customer = est.customers;
  const comfortProName = est.users?.name || "Your comfort pro";
  const estimateUrl = est.online_estimate_url || "";

  const content = step.template
    ?.replace(/\{\{customer_name\}\}/g, customer?.name || "there")
    ?.replace(/\{\{comfort_pro_name\}\}/g, comfortProName)
    ?.replace(/\{\{customer_email\}\}/g, customer?.email || "your email")
    ?.replace(/\{\{estimate_link\}\}/g, estimateUrl);

  if (step.is_call_task) {
    // Call task: schedule and notify
    await serviceClient.from("follow_up_events").insert({
      estimate_id: id,
      sequence_step_index: stepIndex,
      channel: "call",
      status: "scheduled",
      scheduled_at: now.toISOString(),
      content,
    });

    if (est.assigned_to) {
      await serviceClient.from("notifications").insert({
        user_id: est.assigned_to,
        type: "call_due",
        estimate_id: id,
        message: `Call task due: ${customer?.name || "Customer"}`,
      });
    }

    await serviceClient
      .from("estimates")
      .update({ sequence_step_index: stepIndex + 1 })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      sent: "call",
      step_index: stepIndex,
      day_offset: step.day_offset,
    });
  }

  // Auto-send: skip the 30-min edit window, send immediately
  if (step.channel === "email") {
    if (!customer?.email) {
      // Skip step if no email
      await serviceClient.from("follow_up_events").insert({
        estimate_id: id,
        sequence_step_index: stepIndex,
        channel: "email",
        status: "skipped",
        content,
      });
      await serviceClient
        .from("estimates")
        .update({ sequence_step_index: stepIndex + 1 })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        sent: "skipped",
        reason: "No customer email",
      });
    }

    const { error: sendError } = await resend.emails.send({
      from: "Genesis HVAC <marketing@genesishvacr.com>",
      to: customer.email,
      subject: "Follow-up from Genesis Heating & Cooling",
      html: content || "",
    });

    if (sendError) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }
  } else if (step.channel === "sms") {
    if (!customer?.phone) {
      await serviceClient.from("follow_up_events").insert({
        estimate_id: id,
        sequence_step_index: stepIndex,
        channel: "sms",
        status: "skipped",
        content,
      });
      await serviceClient
        .from("estimates")
        .update({ sequence_step_index: stepIndex + 1 })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        sent: "skipped",
        reason: "No customer phone",
      });
    }

    try {
      const twilioMsg = await twilioClient.messages.create({
        body: content || "",
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: customer.phone,
      });

      // Log to messages table for conversation tracking
      await serviceClient.from("messages").insert({
        customer_id: customer.id,
        estimate_id: id,
        direction: "outbound",
        channel: "sms",
        body: content || "",
        twilio_message_sid: twilioMsg.sid,
        phone_number: customer.phone,
      });
    } catch (twilioErr) {
      console.error("SMS send failed:", twilioErr);
      return NextResponse.json(
        { error: "Failed to send SMS" },
        { status: 500 }
      );
    }
  }

  // Create follow_up_event as sent
  await serviceClient.from("follow_up_events").insert({
    estimate_id: id,
    sequence_step_index: stepIndex,
    channel: step.channel,
    status: "sent",
    scheduled_at: now.toISOString(),
    sent_at: now.toISOString(),
    content,
  });

  // Advance step index
  await serviceClient
    .from("estimates")
    .update({ sequence_step_index: stepIndex + 1 })
    .eq("id", id);

  return NextResponse.json({
    success: true,
    sent: step.channel,
    step_index: stepIndex,
    day_offset: step.day_offset,
  });
}
