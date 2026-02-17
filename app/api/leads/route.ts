import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.first_name?.trim()) {
    return NextResponse.json(
      { error: "First name is required" },
      { status: 400 }
    );
  }

  // Normalize phone
  let phone: string | null = null;
  if (body.phone) {
    const digits = body.phone.replace(/\D/g, "");
    if (digits.length === 10) phone = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith("1")) phone = `+${digits}`;
    else phone = body.phone;
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      first_name: body.first_name.trim(),
      last_name: body.last_name?.trim() || "",
      email: body.email || null,
      phone,
      address: body.address || null,
      city: body.city || null,
      state: body.state || "WA",
      zip: body.zip || null,
      lead_source: body.lead_source || null,
      assigned_to: body.assigned_to || null,
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead_id: lead.id });
}
