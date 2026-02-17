import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  // Clear leads.estimate_id FK (no cascade on this FK)
  await serviceClient
    .from("leads")
    .update({ estimate_id: null })
    .eq("estimate_id", id);

  // Delete the estimate — cascades to estimate_options, follow_up_events,
  // notifications (ON DELETE CASCADE), and messages (ON DELETE SET NULL)
  const { error } = await serviceClient
    .from("estimates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete estimate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
