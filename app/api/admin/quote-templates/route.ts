import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/quote-templates — List templates (shared + own)
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const systemType = searchParams.get("system_type");
  const search = searchParams.get("search");

  let query = supabase
    .from("quote_templates")
    .select(`
      *,
      quote_template_tiers (
        id, tier_number, tier_name, tagline, is_recommended, image_url
      ),
      users!quote_templates_created_by_fkey ( name )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (systemType) {
    query = query.eq("system_type", systemType);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data });
}

// POST /api/admin/quote-templates — Create template with tiers + items
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has admin role for is_shared flag
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  if (!body.tiers || !Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json({ error: "At least one tier is required" }, { status: 400 });
  }

  // Only admins can create shared templates
  const isShared = dbUser?.role === "admin" ? (body.is_shared ?? false) : false;

  // 1. Create template
  const { data: template, error: templateError } = await supabase
    .from("quote_templates")
    .insert({
      name: body.name,
      description: body.description || null,
      system_type: body.system_type || null,
      created_by: user.id,
      is_shared: isShared,
    })
    .select()
    .single();

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 500 });
  }

  // 2. Create tiers
  for (const tier of body.tiers) {
    const { data: tierRow, error: tierError } = await supabase
      .from("quote_template_tiers")
      .insert({
        template_id: template.id,
        tier_number: tier.tier_number,
        tier_name: tier.tier_name,
        tagline: tier.tagline || null,
        feature_bullets: tier.feature_bullets || [],
        is_recommended: tier.is_recommended || false,
        image_url: tier.image_url || null,
      })
      .select()
      .single();

    if (tierError) {
      // Cleanup: delete the template we just created
      await supabase.from("quote_templates").delete().eq("id", template.id);
      return NextResponse.json({ error: tierError.message }, { status: 500 });
    }

    // 3. Create items for this tier
    if (tier.items && Array.isArray(tier.items) && tier.items.length > 0) {
      const itemRows = tier.items.map(
        (item: { pricebook_item_id: string; quantity?: number; is_addon?: boolean; addon_default_checked?: boolean; sort_order?: number }, idx: number) => ({
          template_tier_id: tierRow.id,
          pricebook_item_id: item.pricebook_item_id,
          quantity: item.quantity ?? 1,
          is_addon: item.is_addon ?? false,
          addon_default_checked: item.addon_default_checked ?? false,
          sort_order: item.sort_order ?? idx,
        })
      );

      const { error: itemsError } = await supabase
        .from("quote_template_items")
        .insert(itemRows);

      if (itemsError) {
        await supabase.from("quote_templates").delete().eq("id", template.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ template }, { status: 201 });
}
