import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/markup-tiers — List all tiers ordered by tier_number
// Any authenticated user can read (comfort pros need tiers for quote builder price suggestions)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("markup_tiers")
    .select("*")
    .order("tier_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data });
}

// PUT /api/admin/markup-tiers — Replace all tiers (admin sends full array)
// Deletes existing tiers and inserts the new set
export async function PUT(request: Request) {
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
  const { tiers } = body;

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return NextResponse.json(
      { error: "tiers must be a non-empty array" },
      { status: 400 }
    );
  }

  // Validate each tier
  for (const tier of tiers) {
    if (
      typeof tier.tier_number !== "number" ||
      typeof tier.min_cost !== "number" ||
      typeof tier.multiplier !== "number"
    ) {
      return NextResponse.json(
        { error: "Each tier must have tier_number, min_cost, and multiplier as numbers" },
        { status: 400 }
      );
    }
  }

  // Delete all existing tiers, then insert new ones
  const { error: deleteError } = await supabase
    .from("markup_tiers")
    .delete()
    .gte("tier_number", 0); // delete all rows

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = tiers.map((t: { tier_number: number; min_cost: number; max_cost: number | null; multiplier: number }) => ({
    tier_number: t.tier_number,
    min_cost: t.min_cost,
    max_cost: t.max_cost ?? null,
    multiplier: t.multiplier,
  }));

  const { data, error: insertError } = await supabase
    .from("markup_tiers")
    .insert(rows)
    .select()
    .order("tier_number", { ascending: true });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data });
}
