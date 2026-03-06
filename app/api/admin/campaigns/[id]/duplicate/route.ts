import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/campaigns/[id]/duplicate — duplicate a campaign as draft
export async function POST(
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

  const { data: source } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!source)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: `${source.name} (Copy)`,
      type: source.type,
      subject: source.subject,
      email_template_id: source.email_template_id,
      preview_text: source.preview_text,
      sms_body: source.sms_body,
      segment_filter: source.segment_filter,
      exclude_active_pipeline: source.exclude_active_pipeline,
      exclude_recent_contact_days: source.exclude_recent_contact_days,
      batch_size: source.batch_size,
      batch_interval_minutes: source.batch_interval_minutes,
      warmup_mode: source.warmup_mode,
      created_by: user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
