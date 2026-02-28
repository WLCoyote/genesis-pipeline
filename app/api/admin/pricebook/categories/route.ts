import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/pricebook/categories — List all categories (any authenticated user)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("pricebook_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data });
}

// POST /api/admin/pricebook/categories — Create a new category (admin only)
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
  const { name, hcp_type } = body as { name: string; hcp_type: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  if (!hcp_type || !["material", "service"].includes(hcp_type)) {
    return NextResponse.json({ error: "hcp_type must be 'material' or 'service'" }, { status: 400 });
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // Get next display_order
  const { data: maxRow } = await supabase
    .from("pricebook_categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.display_order || 0) + 1;

  const { data, error } = await supabase
    .from("pricebook_categories")
    .insert({ name: name.trim(), slug, hcp_type, display_order: nextOrder })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}

// PUT /api/admin/pricebook/categories — Update a category (admin only)
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
  const { id, name, hcp_type, display_order, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    updates.name = name.trim();
    updates.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }
  if (hcp_type !== undefined) updates.hcp_type = hcp_type;
  if (display_order !== undefined) updates.display_order = display_order;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("pricebook_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
