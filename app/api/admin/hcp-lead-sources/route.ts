import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST() {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hcpBase = process.env.HCP_API_BASE_URL;
  const hcpToken = process.env.HCP_BEARER_TOKEN;

  if (!hcpBase || !hcpToken) {
    return NextResponse.json(
      { error: "HCP API not configured" },
      { status: 500 }
    );
  }

  // Fetch all pages of lead sources
  const allSources: { id: string; name: string }[] = [];
  let page = 1;
  let totalPages = 1;

  try {
    while (page <= totalPages) {
      const res = await fetch(`${hcpBase}/lead_sources?page=${page}`, {
        headers: {
          Authorization: `Bearer ${hcpToken}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("HCP lead sources error:", res.status, errText);
        return NextResponse.json(
          { error: `HCP API error: ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      totalPages = data.total_pages;

      for (const src of data.lead_sources) {
        allSources.push({ id: src.id, name: src.name });
      }

      page++;
    }
  } catch (err) {
    console.error("HCP lead sources exception:", err);
    return NextResponse.json(
      { error: "Failed to connect to HCP API" },
      { status: 502 }
    );
  }

  // Store in settings table
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("settings")
    .upsert(
      {
        key: "hcp_lead_sources",
        value: allSources,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: allSources.length,
    sources: allSources,
  });
}
