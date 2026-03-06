import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { renderCampaignEmail, getUnsubscribeHeaders } from "@/lib/campaign-email";
import { EmailBlock } from "@/lib/campaign-types";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  if (campaign.type !== "email")
    return NextResponse.json({ error: "Test send only supported for email campaigns" }, { status: 400 });

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
