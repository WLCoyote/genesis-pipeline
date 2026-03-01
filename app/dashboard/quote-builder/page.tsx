import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteBuilder from "@/app/components/QuoteBuilder";

export default async function QuoteBuilderPage() {
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
    .select("id, display_name, spec_line, unit_price, cost, manufacturer, model_number, category, system_type, efficiency_rating, is_addon, addon_default_checked, unit_of_measure, hcp_type")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  // Fetch active financing plans (for reference)
  const { data: financingPlans } = await supabase
    .from("financing_plans")
    .select("id, plan_code, label")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch users for assignment dropdown
  const { data: teamUsers } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("is_active", true)
    .in("role", ["admin", "comfort_pro"])
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Quote
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Build a quote with Standard Comfort / Enhanced Efficiency / Premium Performance tiers. A proposal link is generated automatically.
        </p>
      </div>

      <QuoteBuilder
        templates={templates || []}
        pricebookItems={pricebookItems || []}
        financingPlans={financingPlans || []}
        users={teamUsers || []}
        currentUserId={user.id}
      />
    </div>
  );
}
