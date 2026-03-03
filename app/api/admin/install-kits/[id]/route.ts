import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT /api/admin/install-kits/[id] — Update kit + replace items (admin only)
export async function PUT(
  request: Request,
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

  // Update kit fields
  const allowedFields = ["name", "description", "system_type", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("install_kits")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Replace items if provided (delete-all + re-insert)
  if (body.items && Array.isArray(body.items)) {
    // Delete existing items
    await supabase.from("install_kit_items").delete().eq("kit_id", id);

    // Insert new items
    if (body.items.length > 0) {
      const items = body.items.map(
        (item: { pricebook_item_id: string; quantity?: number; sort_order?: number }, i: number) => ({
          kit_id: id,
          pricebook_item_id: item.pricebook_item_id,
          quantity: item.quantity ?? 1,
          sort_order: item.sort_order ?? i,
        })
      );

      const { error: itemsError } = await supabase
        .from("install_kit_items")
        .insert(items);

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }
  }

  // Return updated kit with items
  const { data: kit } = await supabase
    .from("install_kits")
    .select(`
      *,
      install_kit_items (
        id, pricebook_item_id, quantity, sort_order,
        pricebook_items ( id, display_name, unit_price, cost, category )
      )
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ kit });
}

// DELETE /api/admin/install-kits/[id] — Soft-delete (admin only)
export async function DELETE(
  _request: Request,
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
    .from("install_kits")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
