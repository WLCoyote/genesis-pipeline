import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST /api/admin/customers/enrich — Bulk customer enrichment from HCP
// Pages through HCP customers, updates tags + city/zip/state + last_service_date
export async function POST() {
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

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;
  if (!hcpBase || !hcpToken) {
    return NextResponse.json({ error: "HCP API not configured" }, { status: 500 });
  }

  const serviceClient = createServiceClient();
  const tag = "[Enrich]";
  let enriched = 0;
  let pages = 0;
  const maxPages = 10;

  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= maxPages) {
      const res = await fetch(`${hcpBase}/customers?page=${page}&page_size=200`, {
        headers: {
          Authorization: `Bearer ${hcpToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`${tag} HCP API returned ${res.status}`);
        break;
      }

      const data = await res.json();
      totalPages = data.total_pages || 1;
      const customers = (data.customers || []) as Record<string, unknown>[];
      pages++;

      for (const hcpCust of customers) {
        const hcpId = hcpCust.id as string;
        if (!hcpId) continue;

        // Find local customer
        const { data: local } = await serviceClient
          .from("customers")
          .select("id, tags")
          .eq("hcp_customer_id", hcpId)
          .single();

        if (!local) continue;

        const updates: Record<string, unknown> = {};

        // Tags from HCP
        const hcpTags = (hcpCust.tags || []) as string[];
        if (hcpTags.length > 0 && (!local.tags || local.tags.length === 0)) {
          updates.tags = hcpTags;
        }

        // Address parsing
        const addresses = (hcpCust.addresses || []) as Record<string, unknown>[];
        if (addresses.length > 0) {
          const addr = addresses[0];
          if (addr.city) updates.city = addr.city;
          if (addr.state) updates.state = addr.state;
          if (addr.zip) updates.zip = addr.zip;
        }

        if (Object.keys(updates).length > 0) {
          await serviceClient
            .from("customers")
            .update(updates)
            .eq("id", local.id);
          enriched++;
        }
      }

      console.log(`${tag} Page ${page}/${totalPages}: processed ${customers.length} customers`);
      page++;
    }

    console.log(`${tag} Complete: ${enriched} customers enriched across ${pages} pages`);
    return NextResponse.json({ enriched, pages });
  } catch (error) {
    console.error(`${tag} Error:`, error);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
