import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/commission-tiers — List all commission tiers
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("commission_tiers")
    .select("*")
    .order("min_revenue", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers: data });
}

// POST /api/admin/commission-tiers — Create a commission tier (admin only)
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

  if (!body.period || body.min_revenue == null || body.rate_pct == null) {
    return NextResponse.json(
      { error: "period, min_revenue, and rate_pct are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("commission_tiers")
    .insert({
      period: body.period,
      min_revenue: body.min_revenue,
      max_revenue: body.max_revenue ?? null,
      rate_pct: body.rate_pct,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tier: data }, { status: 201 });
}
