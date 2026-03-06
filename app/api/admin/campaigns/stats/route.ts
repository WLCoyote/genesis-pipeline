import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/campaigns/stats — aggregate stats across all campaigns
export async function GET(_request: NextRequest) {
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

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("sent_count, opened_count, clicked_count, bounced_count, unsubscribed_count, status");

  if (!campaigns) return NextResponse.json({ total: 0, active: 0, totalSent: 0, avgOpen: 0, avgClick: 0, totalUnsubscribes: 0 });

  const total = campaigns.length;
  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.opened_count || 0), 0);
  const totalClicked = campaigns.reduce((s, c) => s + (c.clicked_count || 0), 0);
  const totalUnsubscribes = campaigns.reduce((s, c) => s + (c.unsubscribed_count || 0), 0);
  const avgOpen = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const avgClick = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const active = campaigns.filter((c) => ["sending", "scheduled", "paused"].includes(c.status)).length;

  return NextResponse.json({
    total,
    active,
    totalSent,
    avgOpen: Math.round(avgOpen * 10) / 10,
    avgClick: Math.round(avgClick * 10) / 10,
    totalUnsubscribes,
  });
}
