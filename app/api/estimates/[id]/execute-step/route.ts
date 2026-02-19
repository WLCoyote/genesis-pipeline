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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { step_index } = await request.json();

  if (typeof step_index !== "number" || step_index < 0) {
    return NextResponse.json({ error: "Invalid step_index" }, { status: 400 });
  }

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
      id, status, sent_date, sequence_step_index, assigned_to,
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

  const steps = est.follow_up_sequences?.steps as Array<{
    day_offset: number;
    channel: string;
    template: string;
    is_call_task: boolean;
  }>;

  if (!steps || !Array.isArray(steps) || step_index >= steps.length) {
    return NextResponse.json(
      { error: "Invalid step index for this sequence" },
      { status: 400 }
    );
  }

  const step = steps[step_index];
  const now = new Date();

  // Replace template placeholders
  const customer = est.customers;
  const comfortProName = est.users?.name || "Your comfort pro";

  const content = step.template
    ?.replace(/\{\{customer_name\}\}/g, customer?.name || "there")
    ?.replace(/\{\{comfort_pro_name\}\}/g, comfortProName)
    ?.replace(/\{\{customer_email\}\}/g, customer?.email || "your email")
    ?.replace(/\{\{estimate_link\}\}/g, "");

  if (step.is_call_task) {
    // Call task: schedule and notify
    await upsertEvent(serviceClient, id, step_index, {
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

    return NextResponse.json({
      success: true,
      sent: "call",
      step_index,
    });
  }

  // Send email or SMS
  if (step.channel === "email") {
    if (!customer?.email) {
      return NextResponse.json(
        { error: "No customer email" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "No customer phone" },
        { status: 400 }
      );
    }

    try {
      const twilioMsg = await twilioClient.messages.create({
        body: content || "",
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: customer.phone,
      });

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

  // Upsert event as sent (updates existing skipped event or creates new)
  await upsertEvent(serviceClient, id, step_index, {
    channel: step.channel,
    status: "sent",
    scheduled_at: now.toISOString(),
    sent_at: now.toISOString(),
    content,
  });

  return NextResponse.json({
    success: true,
    sent: step.channel,
    step_index,
  });
}

// If a skipped event already exists for this step, update it to sent.
// Otherwise insert a new event.
async function upsertEvent(
  serviceClient: ReturnType<typeof createServiceClient>,
  estimateId: string,
  stepIndex: number,
  fields: Record<string, unknown>
) {
  const { data: existing } = await serviceClient
    .from("follow_up_events")
    .select("id")
    .eq("estimate_id", estimateId)
    .eq("sequence_step_index", stepIndex)
    .eq("status", "skipped")
    .limit(1)
    .single();

  if (existing) {
    await serviceClient
      .from("follow_up_events")
      .update(fields)
      .eq("id", existing.id);
  } else {
    await serviceClient.from("follow_up_events").insert({
      estimate_id: estimateId,
      sequence_step_index: stepIndex,
      ...fields,
    });
  }
}
