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
      estimate_line_items ( option_group, display_name, spec_line, unit_price, quantity )
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

  const lineItems = (estimate.estimate_line_items || []) as Array<{
    option_group: number;
    display_name: string;
    spec_line: string | null;
    unit_price: number;
    quantity: number;
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

  const tierNames: Record<number, string> = { 1: "Good", 2: "Better", 3: "Best" };

  const tiers = Array.from(tierMap.entries()).map(([group, items]) => ({
    tier_name: tierNames[group] || `Option ${group}`,
    items: items.map((item) => ({
      display_name: item.display_name,
      spec_line: item.spec_line,
      unit_price: item.unit_price,
      cost: null,
      quantity: item.quantity,
    })),
  }));

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
