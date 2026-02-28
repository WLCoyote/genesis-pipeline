import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateHcpMaterial, createHcpMaterial } from "@/lib/hcp-pricebook";

// PUT /api/admin/pricebook/[id] — Update item + optional HCP sync (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Category is now dynamic (from pricebook_categories table) — no hardcoded validation

  // Fetch current item to know HCP sync status
  const { data: existing, error: fetchErr } = await supabase
    .from("pricebook_items")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Build update object (only include fields that were sent)
  const updates: Record<string, unknown> = {};
  const allowedFields = [
    "category", "display_name", "spec_line", "description",
    "unit_price", "cost", "unit_of_measure", "manufacturer",
    "model_number", "part_number", "is_addon", "addon_default_checked",
    "applicable_system_types", "is_commissionable", "rebate_amount",
    "taxable", "is_active", "hcp_category_name",
    "system_type", "efficiency_rating", "refrigerant_type",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0 && !body.push_to_hcp) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Save to Pipeline DB first
  let updatedItem = existing;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("pricebook_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    updatedItem = data;
  }

  // HCP sync logic
  let hcpSync: string | null = null;

  try {
    if (updatedItem.hcp_type === "service") {
      // Services are read-only in HCP API
      hcpSync = "skipped_service_readonly";
      console.log(`[Pricebook] HCP sync skipped for service item ${id} (read-only)`);
    } else if (updatedItem.hcp_uuid && updatedItem.hcp_type === "material") {
      // Existing material — push update to HCP
      await updateHcpMaterial(updatedItem.hcp_uuid, {
        name: updatedItem.display_name,
        description: updatedItem.description || undefined,
        price: updatedItem.unit_price != null ? Math.round(updatedItem.unit_price * 100) : undefined,
        cost: updatedItem.cost != null ? Math.round(updatedItem.cost * 100) : undefined,
        taxable: updatedItem.taxable,
        unit_of_measure: updatedItem.unit_of_measure || undefined,
        part_number: updatedItem.part_number || undefined,
      });
      hcpSync = "updated";
      console.log(`[Pricebook] HCP material ${updatedItem.hcp_uuid} updated`);
    } else if (!updatedItem.hcp_uuid && body.push_to_hcp) {
      // Pipeline-only item — create in HCP
      const created = await createHcpMaterial({
        name: updatedItem.display_name,
        description: updatedItem.description || undefined,
        price: updatedItem.unit_price != null ? Math.round(updatedItem.unit_price * 100) : 0,
        cost: updatedItem.cost != null ? Math.round(updatedItem.cost * 100) : undefined,
        taxable: updatedItem.taxable,
        unit_of_measure: updatedItem.unit_of_measure || undefined,
        part_number: updatedItem.part_number || undefined,
      });

      // Store the new HCP uuid back
      await supabase
        .from("pricebook_items")
        .update({ hcp_uuid: created.uuid, hcp_type: "material" })
        .eq("id", id);

      updatedItem.hcp_uuid = created.uuid;
      updatedItem.hcp_type = "material";
      hcpSync = "created_in_hcp";
      console.log(`[Pricebook] Created HCP material ${created.uuid} for item ${id}`);
    }
  } catch (err) {
    // Sync failures are logged but don't fail the Pipeline save
    const message = err instanceof Error ? err.message : "Unknown sync error";
    console.error(`[Pricebook] HCP sync failed for item ${id}:`, message);
    hcpSync = "sync_failed";
  }

  return NextResponse.json({ item: updatedItem, hcp_sync: hcpSync });
}

// DELETE /api/admin/pricebook/[id] — Soft delete (set is_active=false) (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from("pricebook_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
