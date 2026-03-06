import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/campaigns — list campaigns
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/admin/campaigns — create campaign
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: body.name,
      type: body.type || "email",
      subject: body.subject || null,
      email_template_id: body.email_template_id || null,
      preview_text: body.preview_text || null,
      sms_body: body.sms_body || null,
      segment_filter: body.segment_filter || {},
      exclude_active_pipeline: body.exclude_active_pipeline ?? true,
      exclude_recent_contact_days: body.exclude_recent_contact_days ?? 30,
      batch_size: body.batch_size || 50,
      batch_interval_minutes: body.batch_interval_minutes || 60,
      warmup_mode: body.warmup_mode || false,
      scheduled_at: body.scheduled_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
