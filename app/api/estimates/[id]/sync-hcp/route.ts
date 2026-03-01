import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncEstimateToHcp } from "@/lib/hcp-estimate";

// POST /api/estimates/[id]/sync-hcp — Manual retry for HCP sync
export async function POST(
  _request: Request,
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "comfort_pro"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch estimate with customer and line items
  const { data: estimate, error: estErr } = await supabase
    .from("estimates")
    .select(`
      id, estimate_number, hcp_estimate_id, tax_rate,
      customers ( id, name, email, phone, address, hcp_customer_id ),
      estimate_line_items ( option_group, display_name, spec_line, unit_price, quantity, is_addon, is_selected,
        pricebook_items:pricebook_item_id ( hcp_type, category, cost )
      )
    `)
    .eq("id", id)
    .single();

  if (estErr || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.hcp_estimate_id) {
    return NextResponse.json(
      { error: "Estimate is already synced to HCP", hcp_estimate_id: estimate.hcp_estimate_id },
      { status: 400 }
    );
  }

  // Supabase FK join returns object (not array) when using .single()
  // but TS infers array — cast through unknown
  const customerRaw = estimate.customers as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    hcp_customer_id: string | null;
  };

  const lineItems = (estimate.estimate_line_items || []) as unknown as Array<{
    option_group: number;
    display_name: string;
    spec_line: string | null;
    unit_price: number;
    quantity: number;
    is_addon: boolean;
    is_selected: boolean;
    pricebook_items: { hcp_type: string | null; category: string | null; cost: number | null } | null;
  }>;

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No line items to sync" },
      { status: 400 }
    );
  }

  // Group line items by option_group (tier)
  const tierMap = new Map<number, Array<typeof lineItems[0]>>();
  for (const item of lineItems) {
    const group = tierMap.get(item.option_group) || [];
    group.push(item);
    tierMap.set(item.option_group, group);
  }

  const tierNames: Record<number, string> = { 1: "Standard Comfort", 2: "Enhanced Efficiency", 3: "Premium Performance" };

  // Fetch default financing plan
  const { data: defaultFinancingPlan } = await supabase
    .from("financing_plans")
    .select("label, fee_pct, months")
    .eq("is_active", true)
    .eq("is_default", true)
    .limit(1)
    .single();

  const tiers = Array.from(tierMap.entries()).map(([group, items]) => {
    // Only include non-addon items + selected addon items
    const syncItems = items.filter((i) => !i.is_addon || i.is_selected);
    const subtotal = syncItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

    return {
      tier_name: tierNames[group] || `Option ${group}`,
      subtotal: Math.round(subtotal * 100) / 100,
      items: syncItems.map((item) => ({
        display_name: item.display_name,
        spec_line: item.spec_line,
        unit_price: item.unit_price,
        cost: item.pricebook_items?.cost ?? null,
        quantity: item.quantity,
        is_addon: item.is_addon,
        hcp_type: item.pricebook_items?.hcp_type ?? null,
        category: item.pricebook_items?.category ?? null,
      })),
    };
  });

  try {
    const result = await syncEstimateToHcp({
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        hcp_customer_id: customer.hcp_customer_id,
      },
      tiers,
      financingPlan: defaultFinancingPlan || null,
      taxRate: estimate.tax_rate,
    });

    // Store HCP IDs
    await supabase
      .from("estimates")
      .update({ hcp_estimate_id: result.hcp_estimate_id })
      .eq("id", id);

    if (!customer.hcp_customer_id) {
      await supabase
        .from("customers")
        .update({ hcp_customer_id: result.hcp_customer_id })
        .eq("id", customer.id);
    }

    return NextResponse.json({
      success: true,
      hcp_customer_id: result.hcp_customer_id,
      hcp_estimate_id: result.hcp_estimate_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[HCP Sync Retry] Failed for estimate ${id}:`, message);
    return NextResponse.json(
      { error: `HCP sync failed: ${message}` },
      { status: 502 }
    );
  }
}
