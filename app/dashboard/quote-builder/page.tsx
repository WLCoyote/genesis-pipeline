import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteBuilder from "@/app/components/quote-builder/QuoteBuilder";

interface Props {
  searchParams: Promise<{ estimate_id?: string; lead_id?: string }>;
}

export default async function QuoteBuilderPage({ searchParams }: Props) {
  const { estimate_id, lead_id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || !["admin", "comfort_pro"].includes(dbUser.role)) {
    redirect("/dashboard/estimates");
  }

  // Fetch templates (shared + own via RLS)
  const { data: templates } = await supabase
    .from("quote_templates")
    .select(`
      id, name, description, system_type, is_shared,
      quote_template_tiers (
        id, tier_number, tier_name, tagline, is_recommended, image_url
      ),
      users!quote_templates_created_by_fkey ( name )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Fetch pricebook items for the item picker
  const { data: pricebookItems } = await supabase
    .from("pricebook_items")
    .select("id, display_name, spec_line, unit_price, cost, manufacturer, model_number, part_number, category, system_type, efficiency_rating, is_addon, addon_default_checked, unit_of_measure, hcp_type, refrigerant_type, is_favorite")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  // Fetch active financing plans (full data for monthly calculations)
  const { data: financingPlans } = await supabase
    .from("financing_plans")
    .select("id, plan_code, label, fee_pct, months, apr, is_default")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch active install kits with items
  const { data: installKitsRaw } = await supabase
    .from("install_kits")
    .select(`
      id, name, description, system_type,
      install_kit_items (
        pricebook_item_id, quantity,
        pricebook_items ( id, display_name, unit_price )
      )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const installKits = (installKitsRaw || []).map((kit) => {
    const items = ((kit as Record<string, unknown>).install_kit_items as Array<{
      pricebook_item_id: string;
      quantity: number;
      pricebook_items: { id: string; display_name: string; unit_price: number | null } | null;
    }>) || [];
    return {
      id: kit.id,
      name: kit.name,
      description: kit.description,
      system_type: kit.system_type,
      items: items.map((i) => ({
        pricebook_item_id: i.pricebook_item_id,
        quantity: i.quantity,
        display_name: i.pricebook_items?.display_name || "Unknown",
        unit_price: i.pricebook_items?.unit_price ?? 0,
      })),
      total_price: items.reduce((sum, i) => sum + (i.pricebook_items?.unit_price ?? 0) * i.quantity, 0),
    };
  });

  // Fetch active maintenance plans
  const { data: maintenancePlansRaw } = await supabase
    .from("maintenance_plans")
    .select("id, name, description, interval, coverage_items, monthly_price, annual_price")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const maintenancePlans = (maintenancePlansRaw || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    interval: p.interval,
    coverage_items: p.coverage_items || [],
    monthly_price: p.monthly_price,
    annual_price: p.annual_price,
  }));

  // Fetch active payment schedules
  const { data: paymentSchedulesRaw } = await supabase
    .from("payment_schedules")
    .select("id, name, stages, is_default, trigger_tags")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const paymentSchedules = (paymentSchedulesRaw || []).map((s) => ({
    id: s.id,
    name: s.name,
    stages: s.stages || [],
    is_default: s.is_default,
    trigger_tags: s.trigger_tags || [],
  }));

  // Fetch users for assignment dropdown
  const { data: teamUsers } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("is_active", true)
    .in("role", ["admin", "comfort_pro"])
    .order("name", { ascending: true });

  // If coming from a lead, fetch lead data for customer pre-fill
  let prefilledCustomer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null = null;

  if (lead_id && !estimate_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("first_name, last_name, email, phone, address, city, state, zip")
      .eq("id", lead_id)
      .single();

    if (lead) {
      const addressParts = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean);
      prefilledCustomer = {
        name: `${lead.first_name} ${lead.last_name}`.trim(),
        email: lead.email || null,
        phone: lead.phone || null,
        address: addressParts.length > 0 ? addressParts.join(", ") : null,
      };
    }
  }

  // If building from a draft estimate, fetch its data
  let draftEstimate: {
    id: string;
    estimate_number: string;
    hcp_estimate_id: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    assigned_to: string | null;
    proposal_token: string | null;
    line_items?: Array<{
      option_group: number;
      pricebook_item_id: string | null;
      display_name: string;
      spec_line: string | null;
      description: string | null;
      quantity: number;
      unit_price: number;
      is_addon: boolean;
      is_selected: boolean;
      category: string | null;
      sort_order: number;
    }>;
    tier_metadata?: Array<{
      tier_number: number;
      tier_name: string;
      tagline: string;
      feature_bullets: string[];
      is_recommended: boolean;
    }>;
    selected_financing_plan_id?: string | null;
    payment_schedule_id?: string | null;
    include_tax?: boolean;
    tax_rate?: number | null;
  } | null = null;

  if (estimate_id) {
    const { data: est } = await supabase
      .from("estimates")
      .select(`
        id, estimate_number, hcp_estimate_id, assigned_to, status, proposal_signed_at,
        proposal_token, tier_metadata, selected_financing_plan_id, payment_schedule_id, tax_rate,
        customers ( id, name, email, phone, address ),
        estimate_line_items (
          option_group, pricebook_item_id, display_name, spec_line, description,
          quantity, unit_price, is_addon, is_selected, category, sort_order
        )
      `)
      .eq("id", estimate_id)
      .single();

    if (est && (est as Record<string, unknown>).proposal_signed_at) {
      redirect(`/dashboard/estimates/${estimate_id}`);
    }

    if (est) {
      const custRaw = est.customers as unknown;
      const cust = (Array.isArray(custRaw) ? custRaw[0] : custRaw) as {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
      } | null;

      const lineItemsRaw = (est.estimate_line_items || []) as Array<{
        option_group: number;
        pricebook_item_id: string | null;
        display_name: string;
        spec_line: string | null;
        description: string | null;
        quantity: number;
        unit_price: number;
        is_addon: boolean;
        is_selected: boolean;
        category: string | null;
        sort_order: number;
      }>;

      draftEstimate = {
        id: est.id,
        estimate_number: est.estimate_number,
        hcp_estimate_id: est.hcp_estimate_id,
        customer_id: cust?.id || "",
        customer_name: cust?.name || "",
        customer_email: cust?.email || null,
        customer_phone: cust?.phone || null,
        customer_address: cust?.address || null,
        assigned_to: est.assigned_to,
        proposal_token: (est as Record<string, unknown>).proposal_token as string | null,
        line_items: lineItemsRaw.length > 0 ? lineItemsRaw : undefined,
        tier_metadata: ((est as Record<string, unknown>).tier_metadata as Array<{ tier_number: number; tier_name: string; tagline: string; feature_bullets: string[]; is_recommended: boolean }>) || undefined,
        selected_financing_plan_id: ((est as Record<string, unknown>).selected_financing_plan_id as string | null) || null,
        payment_schedule_id: ((est as Record<string, unknown>).payment_schedule_id as string | null) || null,
        include_tax: est.tax_rate != null,
        tax_rate: est.tax_rate,
      };
    }
  }

  return (
    <QuoteBuilder
      templates={templates || []}
      pricebookItems={pricebookItems || []}
      financingPlans={financingPlans || []}
      installKits={installKits}
      maintenancePlans={maintenancePlans}
      paymentSchedules={paymentSchedules}
      users={teamUsers || []}
      currentUserId={user.id}
      draftEstimate={draftEstimate}
      prefilledCustomer={prefilledCustomer}
    />
  );
}
