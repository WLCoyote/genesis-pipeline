import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import twilio from "twilio";
import { renderCampaignEmail, getUnsubscribeHeaders } from "@/lib/campaign-email";
import { EmailBlock } from "@/lib/campaign-types";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || "";

// POST /api/admin/campaigns/[id]/test — send test email to admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dbUser } = await supabase
    .from("users")
    .select("role, email, name")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const testEmail = body.email || dbUser.email;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, email_templates(blocks)")
    .eq("id", id)
    .single();

  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // SMS test send
  if (campaign.type === "sms") {
    const testPhone = body.phone;
    if (!testPhone)
      return NextResponse.json({ error: "Phone number required for SMS test" }, { status: 400 });
    if (!TWILIO_FROM)
      return NextResponse.json({ error: "Twilio phone number not configured" }, { status: 500 });

    let smsBody = campaign.sms_body || "";
    smsBody = smsBody.replace(/\{\{customer_name\}\}/g, dbUser.name || "Test User");
    smsBody = smsBody.replace(/\{\{customer_city\}\}/g, "Monroe");
    smsBody = smsBody.replace(/\{\{company_name\}\}/g, "Genesis Refrigeration & HVAC");
    if (!smsBody.includes("STOP")) {
      smsBody += "\n\nReply STOP to unsubscribe.";
    }

    try {
      await twilioClient.messages.create({
        body: `[TEST] ${smsBody}`,
        from: TWILIO_FROM,
        to: testPhone,
      });
      return NextResponse.json({ sent: true, to: testPhone });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SMS send failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Email test send
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = ((campaign.email_templates as any)?.blocks || []) as EmailBlock[];

  const html = renderCampaignEmail({
    blocks,
    customerName: dbUser.name || "Test User",
    customerEmail: testEmail,
    customerCity: "Monroe",
    companyName: "Genesis Refrigeration & HVAC",
    unsubscribeUrl: "#test-unsubscribe",
    previewText: campaign.preview_text || undefined,
  });

  const headers = getUnsubscribeHeaders("#test-unsubscribe");

  const senderEmail = process.env.RESEND_FROM_EMAIL || "noreply@genesishvacr.com";
  const senderName = "Genesis HVAC";

  const { error: sendError } = await resend.emails.send({
    from: `${senderName} <${senderEmail}>`,
    to: testEmail,
    subject: `[TEST] ${campaign.subject || "No Subject"}`,
    html,
    headers,
  });

  if (sendError)
    return NextResponse.json({ error: sendError.message }, { status: 500 });

  return NextResponse.json({ sent: true, to: testEmail });
}
