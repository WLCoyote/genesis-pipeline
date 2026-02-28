import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/quote-templates/[id] — Full template with tiers + items
export async function GET(
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

  const { data: template, error } = await supabase
    .from("quote_templates")
    .select(`
      *,
      quote_template_tiers (
        *,
        quote_template_items (
          *,
          pricebook_items (
            id, display_name, spec_line, unit_price, cost, manufacturer,
            model_number, category, is_addon, addon_default_checked
          )
        )
      ),
      users!quote_templates_created_by_fkey ( name )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ template });
}

// PUT /api/admin/quote-templates/[id] — Update template (owner or admin)
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

  // Check ownership or admin
  const { data: existing } = await supabase
    .from("quote_templates")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (existing.created_by !== user.id && dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Update template metadata
  const templateUpdates: Record<string, unknown> = {};
  if (body.name !== undefined) templateUpdates.name = body.name;
  if (body.description !== undefined) templateUpdates.description = body.description;
  if (body.system_type !== undefined) templateUpdates.system_type = body.system_type;
  if (body.is_shared !== undefined && dbUser?.role === "admin") {
    templateUpdates.is_shared = body.is_shared;
  }

  if (Object.keys(templateUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("quote_templates")
      .update(templateUpdates)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // If tiers are provided, replace all tiers + items (CASCADE handles cleanup)
  if (body.tiers && Array.isArray(body.tiers)) {
    // Delete existing tiers (cascade deletes items)
    await supabase.from("quote_template_tiers").delete().eq("template_id", id);

    // Insert new tiers + items
    for (const tier of body.tiers) {
      const { data: tierRow, error: tierError } = await supabase
        .from("quote_template_tiers")
        .insert({
          template_id: id,
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
        return NextResponse.json({ error: tierError.message }, { status: 500 });
      }

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
          return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }
      }
    }
  }

  // Re-fetch updated template
  const { data: updated } = await supabase
    .from("quote_templates")
    .select(`
      *,
      quote_template_tiers (
        *,
        quote_template_items (
          *,
          pricebook_items (
            id, display_name, spec_line, unit_price, cost, manufacturer,
            model_number, category, is_addon, addon_default_checked
          )
        )
      )
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ template: updated });
}

// DELETE /api/admin/quote-templates/[id] — Soft-delete (owner or admin)
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

  const { data: existing } = await supabase
    .from("quote_templates")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (existing.created_by !== user.id && dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("quote_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
