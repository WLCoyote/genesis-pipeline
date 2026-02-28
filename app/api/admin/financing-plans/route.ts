import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/financing-plans — List all financing plans
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("financing_plans")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data });
}

// POST /api/admin/financing-plans — Create a financing plan (admin only)
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

  if (!body.plan_code || !body.label || body.fee_pct == null || body.months == null) {
    return NextResponse.json(
      { error: "plan_code, label, fee_pct, and months are required" },
      { status: 400 }
    );
  }

  // If this plan is being set as default, unset any existing default
  if (body.is_default) {
    await supabase
      .from("financing_plans")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("financing_plans")
    .insert({
      plan_code: body.plan_code,
      label: body.label,
      fee_pct: body.fee_pct,
      months: body.months,
      apr: body.apr ?? 0,
      is_default: body.is_default ?? false,
      is_active: body.is_active ?? true,
      synchrony_url: body.synchrony_url ?? null,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data }, { status: 201 });
}
