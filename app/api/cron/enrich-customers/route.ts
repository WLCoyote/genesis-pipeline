import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/cron/enrich-customers — Weekly customer enrichment from HCP
// Finds customers with empty tags and enriches from HCP customer data
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;
  if (!hcpBase || !hcpToken) {
    return NextResponse.json({ error: "HCP API not configured" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const tag = "[Enrich Cron]";
  let enriched = 0;

  try {
    // Get customers with HCP IDs but empty tags (up to 200 per run)
    const { data: customers } = await supabase
      .from("customers")
      .select("id, hcp_customer_id")
      .not("hcp_customer_id", "is", null)
      .or("tags.is.null,tags.eq.{}")
      .limit(200);

    if (!customers || customers.length === 0) {
      console.log(`${tag} No customers need enrichment`);
      return NextResponse.json({ enriched: 0 });
    }

    console.log(`${tag} Enriching ${customers.length} customers`);

    for (const customer of customers) {
      try {
        const res = await fetch(`${hcpBase}/customers/${customer.hcp_customer_id}`, {
          headers: {
            Authorization: `Bearer ${hcpToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) continue;
        const hcpCust = await res.json();

        const updates: Record<string, unknown> = {};
        const hcpTags = (hcpCust.tags || []) as string[];
        if (hcpTags.length > 0) updates.tags = hcpTags;

        const addresses = (hcpCust.addresses || []) as Record<string, unknown>[];
        if (addresses.length > 0) {
          const addr = addresses[0];
          if (addr.city) updates.city = addr.city;
          if (addr.state) updates.state = addr.state;
          if (addr.zip) updates.zip = addr.zip;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("customers").update(updates).eq("id", customer.id);
          enriched++;
        }
      } catch {
        // Skip individual failures
      }
    }

    console.log(`${tag} Complete: ${enriched} customers enriched`);
    return NextResponse.json({ enriched });
  } catch (error) {
    console.error(`${tag} Error:`, error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
