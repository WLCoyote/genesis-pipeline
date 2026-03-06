import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/campaigns/[id]/send — start sending a campaign
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

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (!["draft", "scheduled"].includes(campaign.status))
    return NextResponse.json({ error: "Campaign cannot be sent in its current state" }, { status: 400 });

  // Update status to sending
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "sending",
      started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
