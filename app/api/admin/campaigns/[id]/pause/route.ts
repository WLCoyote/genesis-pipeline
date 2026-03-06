import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/campaigns/[id]/pause — pause or resume a campaign
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
    .select("status")
    .eq("id", id)
    .single();

  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  let newStatus: string;
  if (campaign.status === "sending") {
    newStatus = "paused";
  } else if (campaign.status === "paused") {
    newStatus = "sending";
  } else {
    return NextResponse.json({ error: "Campaign cannot be paused/resumed in its current state" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
