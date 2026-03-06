import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRESET_TEMPLATES } from "@/lib/campaign-presets";

// POST /api/admin/email-templates/seed — seed preset templates (idempotent)
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (dbUser?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check if presets already exist
  const { count } = await supabase
    .from("email_templates")
    .select("*", { count: "exact", head: true })
    .eq("is_preset", true);

  if (count && count > 0) {
    return NextResponse.json({ message: "Presets already exist", count });
  }

  const rows = PRESET_TEMPLATES.map((t) => ({
    name: t.name,
    description: t.description,
    blocks: t.blocks,
    is_preset: true,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from("email_templates")
    .insert(rows)
    .select();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ seeded: data?.length || 0 });
}
