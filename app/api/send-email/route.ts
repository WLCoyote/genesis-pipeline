import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, estimate_id, sequence_step_index, channel } =
      await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    // Send email via Resend
    const { data, error: resendError } = await resend.emails.send({
      from: "Genesis HVAC <marketing@genesishvacr.com>",
      to,
      subject,
      html,
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return NextResponse.json(
        { error: "Failed to send email", details: resendError.message },
        { status: 500 }
      );
    }

    // Log to follow_up_events if this is part of a sequence
    if (estimate_id && sequence_step_index !== undefined) {
      const supabase = createServiceClient();
      const { error: dbError } = await supabase
        .from("follow_up_events")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          content: html,
        })
        .eq("estimate_id", estimate_id)
        .eq("sequence_step_index", sequence_step_index)
        .eq("channel", channel || "email");

      if (dbError) {
        console.error("Database log error:", dbError);
        // Don't fail the request — email was already sent
      }
    }

    return NextResponse.json({ success: true, message_id: data?.id });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
