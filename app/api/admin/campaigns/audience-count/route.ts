import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { countSegmentAudience } from "@/lib/segment-builder";

// POST /api/admin/campaigns/audience-count — live audience count
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    segment_filter = {},
    type = "email",
    exclude_active_pipeline = true,
    exclude_recent_contact_days = 30,
  } = body;

  const count = await countSegmentAudience(
    supabase,
    segment_filter,
    type,
    exclude_active_pipeline,
    exclude_recent_contact_days
  );

  return NextResponse.json({ count });
}
