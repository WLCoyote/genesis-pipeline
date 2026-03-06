import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildAudience } from "@/lib/campaign-sender";

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

  // Build audience in background using service client (RLS bypass)
  const serviceClient = createServiceClient();
  buildAudience(serviceClient, id).catch((err) =>
    console.error(`[Campaign] Build audience error for ${id}:`, err)
  );

  return NextResponse.json(data);
}
