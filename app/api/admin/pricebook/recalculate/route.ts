import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/pricebook/recalculate — Recalculate prices from markup tiers
// Only updates items where manual_price = false and category is material-type
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

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch markup tiers
  const { data: tiers, error: tiersError } = await supabase
    .from("markup_tiers")
    .select("*")
    .order("tier_number", { ascending: true });

  if (tiersError || !tiers || tiers.length === 0) {
    return NextResponse.json(
      { error: "No markup tiers found" },
      { status: 400 }
    );
  }

  // Fetch material-type categories (equipment, material, addon — not labor/service)
  const { data: materialCategories } = await supabase
    .from("pricebook_categories")
    .select("slug")
    .eq("hcp_type", "material");

  const categorySlugs = (materialCategories || []).map((c: { slug: string }) => c.slug);

  if (categorySlugs.length === 0) {
    return NextResponse.json({ error: "No material-type categories found" }, { status: 400 });
  }

  // Fetch eligible items: non-manual, material-type category, has cost
  const { data: items, error: itemsError } = await supabase
    .from("pricebook_items")
    .select("id, cost, category")
    .eq("manual_price", false)
    .eq("is_active", true)
    .in("category", categorySlugs)
    .not("cost", "is", null)
    .gt("cost", 0);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ updated: 0, message: "No eligible items to recalculate" });
  }

  // Find matching tier for a cost
  function findTier(cost: number) {
    return tiers!.find(
      (t: { min_cost: number; max_cost: number | null }) =>
        cost >= t.min_cost && (t.max_cost === null || cost <= t.max_cost)
    ) ?? null;
  }

  // Build updates
  let updated = 0;
  for (const item of items) {
    const tier = findTier(item.cost);
    if (!tier) continue;

    const newPrice = Math.round(item.cost * tier.multiplier * 100) / 100;

    const { error: updateError } = await supabase
      .from("pricebook_items")
      .update({ unit_price: newPrice })
      .eq("id", item.id);

    if (!updateError) updated++;
  }

  return NextResponse.json({
    updated,
    total_eligible: items.length,
    message: `Recalculated ${updated} item${updated !== 1 ? "s" : ""}`,
  });
}
