import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuoteTemplateManager from "@/app/components/QuoteTemplateManager";

export default async function QuoteTemplatesPage() {
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

  const isAdmin = dbUser.role === "admin";

  // Fetch templates (RLS handles visibility)
  const { data: templates } = await supabase
    .from("quote_templates")
    .select(`
      *,
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
    .select("id, display_name, spec_line, unit_price, cost, manufacturer, model_number, category, system_type, efficiency_rating, is_addon, addon_default_checked, unit_of_measure")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  return (
    <div>
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-5">
        <h1 className="font-display text-[22px] font-semibold uppercase tracking-[1px] text-ds-text dark:text-gray-100">
          Quote Templates
        </h1>
      </div>

      <QuoteTemplateManager
        initialTemplates={templates || []}
        pricebookItems={pricebookItems || []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
