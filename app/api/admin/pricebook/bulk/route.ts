import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateHcpMaterial } from "@/lib/hcp-pricebook";

// PUT /api/admin/pricebook/bulk — Bulk update category for selected items (admin only)
export async function PUT(request: NextRequest) {
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

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { ids, category } = body as { ids: string[]; category: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const validCategories = ["equipment", "labor", "material", "addon", "service_plan"];
  if (!category || !validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pricebook_items")
    .update({ category })
    .in("id", ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length || 0, items: data });
}

// POST /api/admin/pricebook/bulk — Bulk sync selected items to HCP (admin only)
export async function POST(request: NextRequest) {
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

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  // Fetch the items
  const { data: items, error: fetchErr } = await supabase
    .from("pricebook_items")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No active items found" }, { status: 404 });
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    // Only sync materials that have an HCP uuid — services are read-only in HCP
    if (item.hcp_type === "service") {
      skipped++;
      continue;
    }

    if (!item.hcp_uuid || item.hcp_type !== "material") {
      skipped++;
      continue;
    }

    try {
      await updateHcpMaterial(item.hcp_uuid, {
        name: item.display_name,
        description: item.description || undefined,
        price: item.unit_price != null ? Math.round(item.unit_price * 100) : undefined,
        cost: item.cost != null ? Math.round(item.cost * 100) : undefined,
        taxable: item.taxable,
        unit_of_measure: item.unit_of_measure || undefined,
        part_number: item.part_number || undefined,
      });
      synced++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${item.display_name}: ${msg}`);
      console.error(`[Pricebook Bulk Sync] Failed for ${item.id}:`, msg);
    }
  }

  return NextResponse.json({
    synced,
    skipped,
    failed,
    total: items.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
