import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/campaigns/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, email_templates(name, blocks)")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json(data);
}

// PUT /api/admin/campaigns/[id]
export async function PUT(
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  // Only allow updates on draft/scheduled campaigns
  const { data: existing } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (existing && !["draft", "scheduled"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Cannot edit a campaign that is sending or already sent" },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  const fields = [
    "name", "type", "subject", "email_template_id", "preview_text",
    "sms_body", "segment_filter", "exclude_active_pipeline",
    "exclude_recent_contact_days", "batch_size", "batch_interval_minutes",
    "warmup_mode", "scheduled_at", "status", "audience_count",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/admin/campaigns/[id]
export async function DELETE(
  _request: NextRequest,
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
