import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { syncEstimateToHcp } from "@/lib/hcp-estimate";

// POST /api/quotes/create — Create estimate from quote builder with line items
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Any authenticated user can create quotes
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "comfort_pro", "csr"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.customer_name?.trim()) {
    return NextResponse.json(
      { error: "Customer name is required" },
      { status: 400 }
    );
  }

  if (!body.tiers || !Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json(
      { error: "At least one tier with items is required" },
      { status: 400 }
    );
  }

  // --- 1. Find or create customer ---
  let customerId: string;

  // Normalize phone
  let phone: string | null = null;
  if (body.customer_phone) {
    const digits = body.customer_phone.replace(/\D/g, "");
    if (digits.length === 10) phone = `+1${digits}`;
    else if (digits.length === 11 && digits.startsWith("1"))
      phone = `+${digits}`;
    else phone = body.customer_phone;
  }

  if (body.customer_id) {
    // Use existing customer
    customerId = body.customer_id;
    // Update info if provided
    const updates: Record<string, unknown> = {};
    if (body.customer_name) updates.name = body.customer_name.trim();
    if (body.customer_email) updates.email = body.customer_email;
    if (phone) updates.phone = phone;
    if (body.customer_address) updates.address = body.customer_address;

    if (Object.keys(updates).length > 0) {
      await supabase.from("customers").update(updates).eq("id", customerId);
    }
  } else if (body.customer_email) {
    // Look up by email
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
    // Create new customer without email
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

  // --- 2. Check if building from existing draft estimate ---
  let existingEstimate: { id: string; estimate_number: string; hcp_estimate_id: string | null } | null = null;

  if (body.existing_estimate_id) {
    const { data: draft } = await supabase
      .from("estimates")
      .select("id, estimate_number, hcp_estimate_id")
      .eq("id", body.existing_estimate_id)
      .eq("status", "draft")
      .single();

    if (draft) {
      existingEstimate = draft;
    }
  }

  // --- 3. Generate estimate number (or reuse from draft) ---
  let estimateNumber: string;

  if (existingEstimate) {
    estimateNumber = existingEstimate.estimate_number;
  } else {
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
  }

  // --- 4. Generate proposal token ---
  const proposalToken = crypto.randomBytes(32).toString("hex");

  // --- 4. Calculate totals per tier ---
  // Each tier: sum of non-addon item line_totals = subtotal for that tier
  // We'll pick the tier with is_recommended or tier 1 as the default for estimate total_amount
  let defaultTierTotal = 0;
  const tierTotals: Record<number, number> = {};

  for (const tier of body.tiers) {
    const tierItems = tier.items || [];
    const nonAddonTotal = tierItems
      .filter((item: { is_addon?: boolean }) => !item.is_addon)
      .reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
          sum + item.quantity * item.unit_price,
        0
      );
    const addonTotal = tierItems
      .filter(
        (item: { is_addon?: boolean; addon_default_checked?: boolean }) =>
          item.is_addon && item.addon_default_checked
      )
      .reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
          sum + item.quantity * item.unit_price,
        0
      );

    tierTotals[tier.tier_number] = nonAddonTotal + addonTotal;

    if (tier.is_recommended || tier.tier_number === 1) {
      defaultTierTotal = nonAddonTotal + addonTotal;
    }
  }

  // Use the recommended tier's total as the estimate total
  const subtotal = defaultTierTotal;
  const taxRate = body.tax_rate ?? null;
  const taxAmount = taxRate !== null ? Math.round(subtotal * taxRate * 100) / 100 : null;
  const totalAmount = taxAmount !== null ? subtotal + taxAmount : subtotal;

  // --- 5. Get default sequence + auto_decline_date ---
  const { data: seq } = await supabase
    .from("follow_up_sequences")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .single();

  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "auto_decline_days")
    .single();

  const autoDeclineDays = (setting?.value as number) || 60;
  const autoDeclineDate = new Date();
  autoDeclineDate.setDate(autoDeclineDate.getDate() + autoDeclineDays);

  // --- 7. Create or update estimate ---
  const assignedTo = body.assigned_to || user.id;
  let estimate: { id: string };

  if (existingEstimate) {
    // Update existing draft → active
    const { error: updateErr } = await supabase
      .from("estimates")
      .update({
        customer_id: customerId,
        assigned_to: assignedTo,
        status: "active",
        total_amount: Math.round(totalAmount * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: taxAmount !== null ? Math.round(taxAmount * 100) / 100 : null,
        sent_date: new Date().toISOString().split("T")[0],
        sequence_id: seq?.id || null,
        sequence_step_index: 0,
        auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
        proposal_token: proposalToken,
        template_id: body.template_id || null,
        payment_schedule_type: body.payment_schedule_type || "standard",
        selected_financing_plan_id: body.selected_financing_plan_id || null,
      })
      .eq("id", existingEstimate.id);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || "Failed to update estimate" },
        { status: 500 }
      );
    }
    estimate = { id: existingEstimate.id };
  } else {
    // Insert new estimate
    const { data: newEst, error: estErr } = await supabase
      .from("estimates")
      .insert({
        estimate_number: estimateNumber,
        customer_id: customerId,
        assigned_to: assignedTo,
        status: "active",
        total_amount: Math.round(totalAmount * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: taxAmount !== null ? Math.round(taxAmount * 100) / 100 : null,
        sent_date: new Date().toISOString().split("T")[0],
        sequence_id: seq?.id || null,
        sequence_step_index: 0,
        auto_decline_date: autoDeclineDate.toISOString().split("T")[0],
        proposal_token: proposalToken,
        template_id: body.template_id || null,
        payment_schedule_type: body.payment_schedule_type || "standard",
        selected_financing_plan_id: body.selected_financing_plan_id || null,
      })
      .select("id")
      .single();

    if (estErr || !newEst) {
      return NextResponse.json(
        { error: estErr?.message || "Failed to create estimate" },
        { status: 500 }
      );
    }
    estimate = newEst;
  }

  // --- 7. Insert estimate_line_items (snapshot prices from pricebook) ---
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

  for (const tier of body.tiers) {
    const items = tier.items || [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const qty = item.quantity ?? 1;
      const price = item.unit_price ?? 0;

      lineItems.push({
        estimate_id: estimate.id,
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
      // Cleanup the estimate we just created
      await supabase.from("estimates").delete().eq("id", estimate.id);
      return NextResponse.json(
        { error: liError.message },
        { status: 500 }
      );
    }
  }

  // --- 8. Notify assigned user ---
  if (assignedTo !== user.id) {
    await supabase.from("notifications").insert({
      user_id: assignedTo,
      type: "lead_assigned",
      estimate_id: estimate.id,
      message: `New quote created: ${body.customer_name.trim()} — ${estimateNumber}`,
    });
  }

  // --- 9. HCP Sync (non-blocking — Pipeline estimate succeeds even if HCP fails) ---
  // Always sync to HCP — even for drafts. The original HCP estimate from the CSR
  // doesn't have the tiered structure Pipeline needs. We create a new structured
  // estimate in HCP with proper options so hcp_option_ids get stored for sign-time writeback.
  let hcpSyncResult: { hcp_customer_id: string; hcp_estimate_id: string } | null = null;
  let hcpSyncError: string | null = null;

  try {
    // Look up existing HCP customer ID
    const { data: customerRow } = await supabase
      .from("customers")
      .select("hcp_customer_id")
      .eq("id", customerId)
      .single();

    // Fetch default financing plan for HCP line item
    const { data: defaultFinancingPlan } = await supabase
      .from("financing_plans")
      .select("label, fee_pct, months")
      .eq("is_active", true)
      .eq("is_default", true)
      .limit(1)
      .single();

    // Build tier data with subtotals for HCP summary line items
    interface HcpTierItem {
      display_name: string;
      spec_line?: string | null;
      unit_price: number;
      cost?: number | null;
      quantity: number;
      is_addon: boolean;
      hcp_type?: string | null;
      category?: string | null;
    }

    const hcpTiers = body.tiers.map((tier: {
      tier_name?: string;
      tier_number: number;
      items?: Array<{
        display_name: string;
        spec_line?: string;
        unit_price: number;
        cost?: number;
        quantity: number;
        is_addon?: boolean;
        addon_default_checked?: boolean;
        hcp_type?: string | null;
        category?: string | null;
      }>;
    }) => {
      const items: HcpTierItem[] = [];
      let subtotal = 0;

      for (const item of tier.items || []) {
        const isAddon = item.is_addon ?? false;
        const lineTotal = (item.quantity ?? 1) * (item.unit_price ?? 0);

        // Subtotal includes non-addon items + checked addon items
        if (!isAddon || item.addon_default_checked) {
          subtotal += lineTotal;
        }

        // Only send checked addons (or non-addons) to HCP
        if (!isAddon || item.addon_default_checked) {
          items.push({
            display_name: item.display_name,
            spec_line: item.spec_line ?? null,
            unit_price: item.unit_price ?? 0,
            cost: item.cost ?? null,
            quantity: item.quantity ?? 1,
            is_addon: isAddon,
            hcp_type: item.hcp_type ?? null,
            category: item.category ?? null,
          });
        }
      }

      return {
        tier_name: tier.tier_name || `Tier ${tier.tier_number}`,
        subtotal: Math.round(subtotal * 100) / 100,
        items,
      };
    });

    const result = await syncEstimateToHcp({
      customer: {
        name: body.customer_name.trim(),
        email: body.customer_email || null,
        phone: phone,
        address: body.customer_address || null,
        hcp_customer_id: customerRow?.hcp_customer_id || null,
      },
      tiers: hcpTiers,
      financingPlan: defaultFinancingPlan || null,
      taxRate: taxRate,
    });

    hcpSyncResult = {
      hcp_customer_id: result.hcp_customer_id,
      hcp_estimate_id: result.hcp_estimate_id,
    };

    // Store HCP IDs back on Pipeline records
    await supabase
      .from("estimates")
      .update({ hcp_estimate_id: result.hcp_estimate_id })
      .eq("id", estimate.id);

    if (!customerRow?.hcp_customer_id) {
      await supabase
        .from("customers")
        .update({ hcp_customer_id: result.hcp_customer_id })
        .eq("id", customerId);
    }

    // Store hcp_option_ids on estimate_line_items by option_group
    const tierNumbers = hcpTiers
      .filter((t: { items: unknown[] }) => t.items.length > 0)
      .map((_: unknown, i: number) => body.tiers[i]?.tier_number as number);

    for (let i = 0; i < result.hcp_option_ids.length; i++) {
      if (tierNumbers[i] != null) {
        await supabase
          .from("estimate_line_items")
          .update({ hcp_option_id: result.hcp_option_ids[i] })
          .eq("estimate_id", estimate.id)
          .eq("option_group", tierNumbers[i]);
      }
    }

    console.log(
      `[HCP Sync] Success: customer=${result.hcp_customer_id}, estimate=${result.hcp_estimate_id}`
    );
  } catch (err) {
    hcpSyncError =
      err instanceof Error ? err.message : "Unknown HCP sync error";
    console.error(`[HCP Sync] Failed for estimate ${estimateNumber}:`, hcpSyncError);
  }

  return NextResponse.json(
    {
      estimate_id: estimate.id,
      estimate_number: estimateNumber,
      proposal_token: proposalToken,
      proposal_url: `/proposals/${proposalToken}`,
      hcp_sync: hcpSyncResult
        ? { success: true, ...hcpSyncResult }
        : { success: false, error: hcpSyncError },
    },
    { status: 201 }
  );
}
