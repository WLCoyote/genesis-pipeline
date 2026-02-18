import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this as Authorization: Bearer <secret>)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const results = { scheduled: 0, sent: 0, errors: 0 };

  // =============================================
  // PHASE 1: Schedule new steps that are due
  // =============================================

  const { data: estimates, error: estError } = await supabase
    .from("estimates")
    .select(
      `
      id, customer_id, assigned_to, sent_date,
      sequence_step_index, sequence_id, snooze_until,
      online_estimate_url,
      customers (id, name, email, phone),
      users!estimates_assigned_to_fkey (name),
      follow_up_sequences (steps, is_active)
    `
    )
    .eq("status", "active")
    .not("sequence_id", "is", null)
    .not("sent_date", "is", null)
    .or(`snooze_until.is.null,snooze_until.lte.${now.toISOString()}`);

  if (estError) {
    console.error("Error fetching estimates:", estError);
    return NextResponse.json(
      { error: "Failed to fetch estimates" },
      { status: 500 }
    );
  }

  for (const estimate of estimates || []) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sequence = estimate.follow_up_sequences as any;
      if (sequence?.is_active === false) continue; // Sequence paused
      const steps = sequence?.steps as Array<{
        day_offset: number;
        channel: string;
        template: string;
        is_call_task: boolean;
      }>;
      if (!steps || !Array.isArray(steps)) continue;

      const stepIndex = estimate.sequence_step_index;
      if (stepIndex >= steps.length) continue; // Sequence complete

      const step = steps[stepIndex];

      // Check if step is due: sent_date + day_offset <= today
      const sentDate = new Date(estimate.sent_date!);
      const dueDate = new Date(sentDate);
      dueDate.setDate(dueDate.getDate() + step.day_offset);

      if (dueDate > now) continue; // Not due yet

      // Check if event already exists for this step (avoid duplicates on repeated runs)
      const { data: existing } = await supabase
        .from("follow_up_events")
        .select("id")
        .eq("estimate_id", estimate.id)
        .eq("sequence_step_index", stepIndex)
        .limit(1);

      if (existing && existing.length > 0) continue; // Already handled

      // Replace template placeholders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = estimate.customers as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comfortProName = (estimate as any).users?.name || "Your comfort pro";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estimateUrl = (estimate as any).online_estimate_url || "";

      const content = step.template
        ?.replace(/\{\{customer_name\}\}/g, customer?.name || "there")
        ?.replace(/\{\{comfort_pro_name\}\}/g, comfortProName)
        ?.replace(/\{\{customer_email\}\}/g, customer?.email || "your email")
        ?.replace(/\{\{estimate_link\}\}/g, estimateUrl);

      if (step.is_call_task) {
        // Call task: schedule it and notify the comfort pro
        await supabase.from("follow_up_events").insert({
          estimate_id: estimate.id,
          sequence_step_index: stepIndex,
          channel: "call",
          status: "scheduled",
          scheduled_at: now.toISOString(),
          content,
        });

        if (estimate.assigned_to) {
          await supabase.from("notifications").insert({
            user_id: estimate.assigned_to,
            type: "call_due",
            estimate_id: estimate.id,
            message: `Call task due: ${customer?.name || "Customer"}`,
          });
        }

        // Advance to next step — call task is now in the comfort pro's queue
        await supabase
          .from("estimates")
          .update({ sequence_step_index: stepIndex + 1 })
          .eq("id", estimate.id);

        results.scheduled++;
      } else {
        // Auto-send: create pending_review event with 30-minute edit window
        const reviewDeadline = new Date(now.getTime() + 30 * 60 * 1000);

        await supabase.from("follow_up_events").insert({
          estimate_id: estimate.id,
          sequence_step_index: stepIndex,
          channel: step.channel,
          status: "pending_review",
          scheduled_at: reviewDeadline.toISOString(),
          content,
        });

        results.scheduled++;
      }
    } catch (err) {
      console.error(`Error scheduling estimate ${estimate.id}:`, err);
      results.errors++;
    }
  }

  // =============================================
  // PHASE 2: Send pending_review events past their 30-min edit window
  // =============================================

  const { data: pendingEvents, error: pendingError } = await supabase
    .from("follow_up_events")
    .select(
      `
      id, estimate_id, sequence_step_index, channel, content,
      estimates (id, customer_id, assigned_to, status,
        customers (name, email, phone),
        follow_up_sequences (steps, is_active))
    `
    )
    .eq("status", "pending_review")
    .lte("scheduled_at", now.toISOString());

  if (pendingError) {
    console.error("Error fetching pending events:", pendingError);
  }

  for (const event of pendingEvents || []) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estimate = event.estimates as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = estimate?.customers as any;

      // Validate the step still exists and sequence is active
      const seqSteps = estimate?.follow_up_sequences?.steps as Array<unknown> | undefined;
      const seqActive = estimate?.follow_up_sequences?.is_active;
      if (
        !seqSteps ||
        !Array.isArray(seqSteps) ||
        event.sequence_step_index >= seqSteps.length ||
        estimate?.status !== "active" ||
        seqActive === false
      ) {
        // Sequence was changed or estimate is no longer active — skip this event
        await supabase
          .from("follow_up_events")
          .update({ status: "skipped" })
          .eq("id", event.id);
        // Advance step index so we don't get stuck
        await supabase
          .from("estimates")
          .update({ sequence_step_index: event.sequence_step_index + 1 })
          .eq("id", event.estimate_id);
        continue;
      }

      if (event.channel === "email") {
        if (!customer?.email) {
          console.warn(`No email for event ${event.id}, skipping`);
          await supabase
            .from("follow_up_events")
            .update({ status: "skipped" })
            .eq("id", event.id);
          await supabase
            .from("estimates")
            .update({ sequence_step_index: event.sequence_step_index + 1 })
            .eq("id", event.estimate_id);
          continue;
        }

        const { error: sendError } = await resend.emails.send({
          from: "Genesis HVAC <marketing@genesishvacr.com>",
          to: customer.email,
          subject: "Follow-up from Genesis Heating & Cooling",
          html: event.content || "",
        });

        if (sendError) {
          console.error(`Email send failed for event ${event.id}:`, sendError);
          results.errors++;
          continue;
        }
      } else if (event.channel === "sms") {
        if (!customer?.phone) {
          console.warn(`No phone for event ${event.id}, skipping`);
          await supabase
            .from("follow_up_events")
            .update({ status: "skipped" })
            .eq("id", event.id);
          await supabase
            .from("estimates")
            .update({ sequence_step_index: event.sequence_step_index + 1 })
            .eq("id", event.estimate_id);
          continue;
        }

        try {
          const twilioMsg = await twilioClient.messages.create({
            body: event.content || "",
            from: process.env.TWILIO_PHONE_NUMBER,
            to: customer.phone,
          });

          // Log to messages table for conversation tracking
          await supabase.from("messages").insert({
            customer_id: estimate?.customer_id as string,
            estimate_id: event.estimate_id,
            direction: "outbound",
            channel: "sms",
            body: event.content || "",
            twilio_message_sid: twilioMsg.sid,
          });
        } catch (twilioErr) {
          console.error(`SMS send failed for event ${event.id}:`, twilioErr);
          results.errors++;
          continue;
        }
      }

      // Mark event as sent
      await supabase
        .from("follow_up_events")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", event.id);

      // Advance estimate to next step
      await supabase
        .from("estimates")
        .update({ sequence_step_index: event.sequence_step_index + 1 })
        .eq("id", event.estimate_id);

      results.sent++;
    } catch (err) {
      console.error(`Error sending event ${event.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
