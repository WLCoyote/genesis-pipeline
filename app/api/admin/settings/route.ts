import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { settings } = await request.json();

  if (!settings || typeof settings !== "object") {
    return NextResponse.json(
      { error: "Settings object is required" },
      { status: 400 }
    );
  }

  // Upsert each setting
  const entries = Object.entries(settings);
  for (const [key, value] of entries) {
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key, value, updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
