import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const { to, message, customer_id, estimate_id, sequence_step_index, sent_by } =
      await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, message" },
        { status: 400 }
      );
    }

    // Send SMS via Twilio
    let twilioMessage;
    try {
      twilioMessage = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    } catch (twilioError: unknown) {
      const errorMessage =
        twilioError instanceof Error ? twilioError.message : "Unknown Twilio error";
      console.error("Twilio error:", errorMessage);
      return NextResponse.json(
        { error: "Failed to send SMS", details: errorMessage },
        { status: 500 }
      );
    }

    const supabase = createServiceClient();

    // Log to messages table for conversation tracking
    const { error: msgError } = await supabase.from("messages").insert({
      customer_id: customer_id || null,
      estimate_id: estimate_id || null,
      direction: "outbound",
      channel: "sms",
      body: message,
      twilio_message_sid: twilioMessage.sid,
      phone_number: to,
      sent_by: sent_by || null,
    });

    if (msgError) {
      console.error("Messages table log error:", msgError);
    }

    // Update follow_up_events if this is part of a sequence
    if (estimate_id && sequence_step_index !== undefined) {
      const { error: eventError } = await supabase
        .from("follow_up_events")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          content: message,
        })
        .eq("estimate_id", estimate_id)
        .eq("sequence_step_index", sequence_step_index)
        .eq("channel", "sms");

      if (eventError) {
        console.error("Follow-up event log error:", eventError);
      }
    }

    return NextResponse.json({
      success: true,
      message_sid: twilioMessage.sid,
    });
  } catch (error) {
    console.error("Send SMS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
