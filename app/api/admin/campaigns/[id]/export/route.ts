import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/campaigns/[id]/export — CSV export of campaign recipients
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("name")
    .eq("id", id)
    .single();

  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Fetch all recipients with customer data
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("status, sent_at, opened_at, clicked_at, unsubscribed_at, batch_number, customers(name, email, phone)")
    .eq("campaign_id", id)
    .order("batch_number", { ascending: true });

  if (!recipients || recipients.length === 0) {
    return new NextResponse("No recipients", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Build CSV
  const headers = ["Name", "Email", "Phone", "Status", "Batch", "Sent At", "Opened At", "Clicked At", "Unsubscribed At"];
  const rows = recipients.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = r.customers as any;
    return [
      csvEscape(c?.name || ""),
      csvEscape(c?.email || ""),
      csvEscape(c?.phone || ""),
      r.status,
      r.batch_number?.toString() || "",
      r.sent_at || "",
      r.opened_at || "",
      r.clicked_at || "",
      r.unsubscribed_at || "",
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `campaign-${campaign.name.replace(/[^a-zA-Z0-9]/g, "_")}-recipients.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
