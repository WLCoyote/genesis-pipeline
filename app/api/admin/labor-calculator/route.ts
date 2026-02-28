import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/labor-calculator — Read saved labor calculator inputs from settings
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "labor_calculator")
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (not an error — just means no saved inputs yet)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inputs: data?.value ?? null });
}

// PUT /api/admin/labor-calculator — Save labor calculator inputs to settings (admin only)
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
  const { inputs } = body;

  if (!inputs || typeof inputs !== "object") {
    return NextResponse.json(
      { error: "inputs must be an object" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        key: "labor_calculator",
        value: inputs,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
