import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/unsubscribe/[token] — One-click unsubscribe (RFC 8058 List-Unsubscribe)
// POST /api/unsubscribe/[token] — Form-based unsubscribe
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleUnsubscribe(await params);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleUnsubscribe(await params);
}

async function handleUnsubscribe({ token }: { token: string }) {
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up token
  const { data: unsub } = await supabase
    .from("unsubscribe_tokens")
    .select("customer_id")
    .eq("token", token)
    .single();

  if (!unsub) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  // Mark customer as marketing unsubscribed
  await supabase
    .from("customers")
    .update({ marketing_unsubscribed: true })
    .eq("id", unsub.customer_id);

  // Also update any queued campaign recipients for this customer
  await supabase
    .from("campaign_recipients")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("customer_id", unsub.customer_id)
    .eq("status", "queued");

  return NextResponse.json({ success: true });
}
