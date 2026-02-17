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

  // CSR and admin can create estimates
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    customer_name,
    customer_email,
    customer_phone,
    estimate_number,
    total_amount,
    assigned_to,
  } = await request.json();

  if (!customer_name?.trim() || !estimate_number?.trim()) {
    return NextResponse.json(
      { error: "Customer name and estimate number are required" },
      { status: 400 }
    );
  }

  // Normalize phone
  let phone: string | null = null;
  if (customer_phone) {
    const digits = customer_phone.replace(/\D/g, "");
    if (digits.length === 10) phone = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith("1")) phone = `+${digits}`;
    else phone = customer_phone;
  }

  // Create or find customer
  let customerId: string;

  if (customer_email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customer_email)
      .limit(1)
      .single();

    if (existing) {
      customerId = existing.id;
      // Update phone/name if provided
      await supabase
        .from("customers")
        .update({
          name: customer_name.trim(),
          phone: phone || undefined,
        })
        .eq("id", existing.id);
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: customer_name.trim(),
          email: customer_email,
          phone,
        })
        .select("id")
        .single();

      if (custErr || !newCust) {
        return NextResponse.json(
          { error: custErr?.message || "Failed to create customer" },
          { status: 500 }
        );
      }
      customerId = newCust.id;
    }
  } else {
    const { data: newCust, error: custErr } = await supabase
      .from("customers")
      .insert({
        name: customer_name.trim(),
        phone,
      })
      .select("id")
      .single();

    if (custErr || !newCust) {
      return NextResponse.json(
        { error: custErr?.message || "Failed to create customer" },
        { status: 500 }
      );
    }
    customerId = newCust.id;
  }

  // Get default sequence
  const { data: seq } = await supabase
    .from("follow_up_sequences")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .single();

  // Get auto_decline_days
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_decline_days")
    .single();

  const autoDeclineDays = (setting?.value as number) || 60;
  const autoDeclineDate = new Date();
  autoDeclineDate.setDate(autoDeclineDate.getDate() + autoDeclineDays);

  // Create estimate
  const { data: newEst, error: estErr } = await supabase
    .from("estimates")
    .insert({
      estimate_number: estimate_number.trim(),
      customer_id: customerId,
      assigned_to: assigned_to || null,
      status: "active",
      total_amount: total_amount ? parseFloat(total_amount) : null,
      sent_date: new Date().toISOString().split("T")[0],
      sequence_id: seq?.id || null,
      sequence_step_index: 0,
      auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (estErr || !newEst) {
    return NextResponse.json(
      { error: estErr?.message || "Failed to create estimate" },
      { status: 500 }
    );
  }

  // Notify assigned comfort pro
  if (assigned_to) {
    await supabase.from("notifications").insert({
      user_id: assigned_to,
      type: "lead_assigned",
      estimate_id: newEst.id,
      message: `New estimate assigned: ${customer_name.trim()} — $${total_amount || 0}`,
    });
  }

  return NextResponse.json({ success: true, estimate_id: newEst.id });
}
