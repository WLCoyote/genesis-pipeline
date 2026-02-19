import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET: Fetch unmatched SMS threads grouped by phone number
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  // Fetch all non-dismissed SMS messages with no estimate
  const { data: messages, error } = await serviceClient
    .from("messages")
    .select("*")
    .is("estimate_id", null)
    .eq("dismissed", false)
    .eq("channel", "sms")
    .not("phone_number", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group into threads by phone_number
  const threadMap = new Map<string, typeof messages>();
  for (const msg of messages || []) {
    const phone = msg.phone_number!;
    if (!threadMap.has(phone)) {
      threadMap.set(phone, []);
    }
    threadMap.get(phone)!.push(msg);
  }

  // Convert to array sorted by most recent message (newest thread first)
  const threads = Array.from(threadMap.entries())
    .map(([phone, msgs]) => ({
      phone_number: phone,
      messages: msgs,
      last_message_at: msgs[msgs.length - 1].created_at,
      message_count: msgs.length,
    }))
    .sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );

  return NextResponse.json({ threads });
}

// POST: Reply to a phone number from the inbox
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to, message } = await request.json();

  if (!to || !message?.trim()) {
    return NextResponse.json(
      { error: "Phone number (to) and message are required" },
      { status: 400 }
    );
  }

  // Send via the existing send-sms route
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let res;
  try {
    res = await fetch(`${baseUrl}/api/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        message: message.trim(),
        sent_by: user.id,
      }),
    });
  } catch (fetchError) {
    console.error("Inbox send-sms fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to reach SMS service" },
      { status: 500 }
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(
      { error: data?.error || data?.details || "Failed to send SMS" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// PATCH: Dismiss a thread by phone number
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phone_number } = await request.json();

  if (!phone_number) {
    return NextResponse.json(
      { error: "phone_number is required" },
      { status: 400 }
    );
  }

  // Dismiss all messages in this thread
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("messages")
    .update({ dismissed: true })
    .eq("phone_number", phone_number)
    .is("estimate_id", null)
    .eq("channel", "sms");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
