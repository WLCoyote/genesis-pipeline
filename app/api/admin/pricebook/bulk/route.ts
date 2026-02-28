import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateHcpMaterial, buildHcpDescription } from "@/lib/hcp-pricebook";

// Helper: admin auth check
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "admin") return { error: "Forbidden", status: 403 };
  return null;
}

// PUT /api/admin/pricebook/bulk — Bulk update: category change, activate, deactivate, price adjust
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const authErr = await requireAdmin(supabase);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  // Route by action type
  if (action === "category") {
    const { category } = body as { category: string };
    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pricebook_items")
      .update({ category })
      .in("id", ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data?.length || 0, items: data });
  }

  if (action === "activate") {
    const { data, error } = await supabase
      .from("pricebook_items")
      .update({ is_active: true })
      .in("id", ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data?.length || 0 });
  }

  if (action === "deactivate") {
    const { data, error } = await supabase
      .from("pricebook_items")
      .update({ is_active: false })
      .in("id", ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data?.length || 0 });
  }

  if (action === "price_adjust") {
    const { percent } = body as { percent: number };
    if (percent == null || typeof percent !== "number") {
      return NextResponse.json({ error: "percent is required (number)" }, { status: 400 });
    }

    // Fetch items to calculate new prices
    const { data: items, error: fetchErr } = await supabase
      .from("pricebook_items")
      .select("id, cost, unit_price")
      .in("id", ids);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items found" }, { status: 404 });
    }

    const multiplier = 1 + percent / 100;
    let updated = 0;

    for (const item of items) {
      const updates: Record<string, number | null> = {};

      if (item.cost != null) {
        updates.cost = Math.round(item.cost * multiplier * 100) / 100;
      }
      if (item.unit_price != null) {
        updates.unit_price = Math.round(item.unit_price * multiplier * 100) / 100;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("pricebook_items")
          .update(updates)
          .eq("id", item.id);

        if (!error) updated++;
      }
    }

    return NextResponse.json({ updated, total: items.length, percent });
  }

  if (action === "edit") {
    const { fields } = body as { fields: Record<string, unknown> };
    if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "fields object is required" }, { status: 400 });
    }

    // Only allow known pricebook_items columns
    const allowedFields = [
      "category", "display_name", "spec_line", "description",
      "unit_price", "cost", "unit_of_measure", "manufacturer",
      "model_number", "part_number", "is_addon", "addon_default_checked",
      "applicable_system_types", "is_commissionable", "rebate_amount",
      "taxable", "is_active", "hcp_category_name",
      "system_type", "efficiency_rating", "refrigerant_type", "supplier_id", "manual_price",
    ];

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pricebook_items")
      .update(updates)
      .in("id", ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data?.length || 0, items: data });
  }

  // Legacy: if no action specified, treat as category change (backward compat)
  const { category } = body as { category: string };
  if (category) {
    const { data, error } = await supabase
      .from("pricebook_items")
      .update({ category })
      .in("id", ids)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data?.length || 0, items: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST /api/admin/pricebook/bulk — Bulk sync selected items to HCP (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const authErr = await requireAdmin(supabase);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const { data: items, error: fetchErr } = await supabase
    .from("pricebook_items")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No active items found" }, { status: 404 });
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    if (item.hcp_type === "service" || !item.hcp_uuid || item.hcp_type !== "material") {
      skipped++;
      continue;
    }

    try {
      await updateHcpMaterial(item.hcp_uuid, {
        name: item.display_name,
        description: buildHcpDescription(item),
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
