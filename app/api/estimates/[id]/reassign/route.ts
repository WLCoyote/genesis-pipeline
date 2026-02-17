import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
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

  // CSR and admin can reassign
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assigned_to } = await request.json();

  const { error } = await supabase
    .from("estimates")
    .update({ assigned_to: assigned_to || null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify new assignee
  if (assigned_to) {
    const { data: est } = await supabase
      .from("estimates")
      .select("estimate_number, customers ( name )")
      .eq("id", id)
      .single();

    const estData = est as any;
    await supabase.from("notifications").insert({
      user_id: assigned_to,
      type: "lead_assigned",
      estimate_id: id,
      message: `Estimate reassigned to you: ${estData?.customers?.name || "Unknown"} — #${estData?.estimate_number}`,
    });
  }

  return NextResponse.json({ success: true });
}
