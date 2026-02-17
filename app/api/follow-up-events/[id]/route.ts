import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  // Only allow editing pending_review events
  const { data: event } = await supabase
    .from("follow_up_events")
    .select("status")
    .eq("id", id)
    .single();

  if (!event || event.status !== "pending_review") {
    return NextResponse.json(
      { error: "Can only edit messages in pending_review status" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("follow_up_events")
    .update({ content: content.trim(), comfort_pro_edited: true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
