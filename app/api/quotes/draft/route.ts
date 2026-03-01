import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/quotes/draft — Save or update a draft estimate (no proposal token, no HCP sync)
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

  if (!dbUser || !["admin", "comfort_pro", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.customer_name?.trim()) {
    return NextResponse.json(
      { error: "Customer name is required" },
      { status: 400 }
    );
  }

  // --- 1. Find or create customer ---
  let customerId: string;

  let phone: string | null = null;
  if (body.customer_phone) {
    const digits = body.customer_phone.replace(/\D/g, "");
    if (digits.length === 10) phone = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith("1"))
      phone = `+${digits}`;
    else phone = body.customer_phone;
  }

  if (body.customer_id) {
    customerId = body.customer_id;
    const updates: Record<string, unknown> = {};
    if (body.customer_name) updates.name = body.customer_name.trim();
    if (body.customer_email) updates.email = body.customer_email;
    if (phone) updates.phone = phone;
    if (body.customer_address) updates.address = body.customer_address;
    if (Object.keys(updates).length > 0) {
      await supabase.from("customers").update(updates).eq("id", customerId);
    }
  } else if (body.customer_email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", body.customer_email)
      .limit(1)
      .single();

    if (existing) {
      customerId = existing.id;
      await supabase
        .from("customers")
        .update({
          name: body.customer_name.trim(),
          ...(phone && { phone }),
          ...(body.customer_address && { address: body.customer_address }),
        })
        .eq("id", existing.id);
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: body.customer_name.trim(),
          email: body.customer_email,
          phone,
          address: body.customer_address || null,
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
        name: body.customer_name.trim(),
        phone,
        address: body.customer_address || null,
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

  // --- 2. Calculate totals for the recommended tier ---
  let defaultTierTotal = 0;
  for (const tier of body.tiers || []) {
    const items = tier.items || [];
    const total = items.reduce(
      (sum: number, item: { quantity: number; unit_price: number; is_addon?: boolean; addon_default_checked?: boolean }) => {
        if (item.is_addon && !item.addon_default_checked) return sum;
        return sum + (item.quantity ?? 1) * (item.unit_price ?? 0);
      },
      0
    );
    if (tier.is_recommended || tier.tier_number === 1) {
      defaultTierTotal = total;
    }
  }

  const taxRate = body.tax_rate ?? null;
  const taxAmount = taxRate !== null ? Math.round(defaultTierTotal * taxRate * 100) / 100 : null;
  const totalAmount = taxAmount !== null ? defaultTierTotal + taxAmount : defaultTierTotal;

  // --- 3. Create or update draft estimate ---
  const assignedTo = body.assigned_to || user.id;
  let estimateId: string;
  let estimateNumber: string;

  if (body.existing_estimate_id) {
    // Update existing draft
    const { data: existing } = await supabase
      .from("estimates")
      .select("id, estimate_number")
      .eq("id", body.existing_estimate_id)
      .single();

    if (existing) {
      estimateId = existing.id;
      estimateNumber = existing.estimate_number;

      await supabase
        .from("estimates")
        .update({
          customer_id: customerId,
          assigned_to: assignedTo,
          total_amount: Math.round(totalAmount * 100) / 100,
          subtotal: Math.round(defaultTierTotal * 100) / 100,
          tax_rate: taxRate,
          tax_amount: taxAmount !== null ? Math.round(taxAmount * 100) / 100 : null,
          template_id: body.template_id || null,
          selected_financing_plan_id: body.selected_financing_plan_id || null,
        })
        .eq("id", estimateId);

      // Delete old line items so we can replace them
      await supabase
        .from("estimate_line_items")
        .delete()
        .eq("estimate_id", estimateId);
    } else {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
  } else {
    // Generate new estimate number
    const { data: lastEst } = await supabase
      .from("estimates")
      .select("estimate_number")
      .like("estimate_number", "GEN-%")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1001;
    if (lastEst?.estimate_number) {
      const match = lastEst.estimate_number.match(/^GEN-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    estimateNumber = `GEN-${nextNum}`;

    const { data: newEst, error: estErr } = await supabase
      .from("estimates")
      .insert({
        estimate_number: estimateNumber,
        customer_id: customerId,
        assigned_to: assignedTo,
        status: "draft",
        total_amount: Math.round(totalAmount * 100) / 100,
        subtotal: Math.round(defaultTierTotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: taxAmount !== null ? Math.round(taxAmount * 100) / 100 : null,
        template_id: body.template_id || null,
        selected_financing_plan_id: body.selected_financing_plan_id || null,
      })
      .select("id")
      .single();

    if (estErr || !newEst) {
      return NextResponse.json(
        { error: estErr?.message || "Failed to create draft" },
        { status: 500 }
      );
    }
    estimateId = newEst.id;
  }

  // --- 4. Insert line items ---
  const lineItems: Array<{
    estimate_id: string;
    pricebook_item_id: string | null;
    option_group: number;
    display_name: string;
    spec_line: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_addon: boolean;
    is_selected: boolean;
    sort_order: number;
    category: string | null;
  }> = [];

  for (const tier of body.tiers || []) {
    const items = tier.items || [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const qty = item.quantity ?? 1;
      const price = item.unit_price ?? 0;

      lineItems.push({
        estimate_id: estimateId,
        pricebook_item_id: item.pricebook_item_id || null,
        option_group: tier.tier_number,
        display_name: item.display_name,
        spec_line: item.spec_line || null,
        description: item.description || null,
        quantity: qty,
        unit_price: price,
        line_total: Math.round(qty * price * 100) / 100,
        is_addon: item.is_addon ?? false,
        is_selected: item.addon_default_checked ?? !item.is_addon,
        sort_order: item.sort_order ?? idx,
        category: item.category || null,
      });
    }
  }

  if (lineItems.length > 0) {
    const { error: liError } = await supabase
      .from("estimate_line_items")
      .insert(lineItems);

    if (liError) {
      console.error("[Draft] Failed to insert line items:", liError.message);
    }
  }

  return NextResponse.json({
    estimate_id: estimateId,
    estimate_number: estimateNumber,
  });
}
