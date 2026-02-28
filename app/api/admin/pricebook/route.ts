import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/pricebook — List pricebook items with optional filters
// Any authenticated user can read (comfort pros need it for future quote builder)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const active = url.searchParams.get("active"); // "true" | "false" | null (all)

  let query = supabase
    .from("pricebook_items")
    .select("*")
    .order("display_name", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,spec_line.ilike.%${search}%,manufacturer.ilike.%${search}%,part_number.ilike.%${search}%`
    );
  }

  if (active === "true") {
    query = query.eq("is_active", true);
  } else if (active === "false") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

// POST /api/admin/pricebook — Create a new pricebook item (admin only)
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

  if (!body.display_name || !body.category) {
    return NextResponse.json(
      { error: "display_name and category are required" },
      { status: 400 }
    );
  }

  const validCategories = ["equipment", "labor", "material", "addon", "service_plan"];
  if (!validCategories.includes(body.category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  const row = {
    category: body.category,
    display_name: body.display_name,
    spec_line: body.spec_line || null,
    description: body.description || null,
    unit_price: body.unit_price ?? null,
    cost: body.cost ?? null,
    unit_of_measure: body.unit_of_measure || null,
    manufacturer: body.manufacturer || null,
    model_number: body.model_number || null,
    part_number: body.part_number || null,
    is_addon: body.is_addon ?? false,
    addon_default_checked: body.addon_default_checked ?? false,
    applicable_system_types: body.applicable_system_types || null,
    is_commissionable: body.is_commissionable ?? true,
    rebate_amount: body.rebate_amount ?? null,
    taxable: body.taxable ?? true,
    is_active: body.is_active ?? true,
    hcp_category_name: body.hcp_category_name || null,
  };

  const { data, error } = await supabase
    .from("pricebook_items")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
