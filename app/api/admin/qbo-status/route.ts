import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/qbo-status — Check if QBO is connected
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "qbo_tokens")
    .single();

  const connected = !!(data?.value);
  return NextResponse.json({ connected });
}

// DELETE /api/admin/qbo-status — Disconnect QBO (admin only)
export async function DELETE() {
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

  await supabase.from("settings").delete().eq("key", "qbo_tokens");

  return NextResponse.json({ success: true });
}
