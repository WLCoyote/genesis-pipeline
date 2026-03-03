import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/install-kits — List all install kits with items
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("install_kits")
    .select(`
      *,
      install_kit_items (
        id, pricebook_item_id, quantity, sort_order,
        pricebook_items ( id, display_name, unit_price, cost, category )
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kits: data });
}

// POST /api/admin/install-kits — Create a kit (admin only)
export async function POST(request: Request) {
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

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  // Create kit
  const { data: kit, error: kitError } = await supabase
    .from("install_kits")
    .insert({
      name: body.name.trim(),
      description: body.description || null,
      system_type: body.system_type || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (kitError) {
    return NextResponse.json({ error: kitError.message }, { status: 500 });
  }

  // Insert kit items if provided
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    const items = body.items.map(
      (item: { pricebook_item_id: string; quantity?: number; sort_order?: number }, i: number) => ({
        kit_id: kit.id,
        pricebook_item_id: item.pricebook_item_id,
        quantity: item.quantity ?? 1,
        sort_order: item.sort_order ?? i,
      })
    );

    const { error: itemsError } = await supabase
      .from("install_kit_items")
      .insert(items);

    if (itemsError) {
      console.error("Failed to insert kit items:", itemsError);
    }
  }

  return NextResponse.json({ kit }, { status: 201 });
}
