import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InstallKitManager from "@/app/components/InstallKitManager";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function InstallKitsPage() {
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

  if (dbUser?.role !== "admin") redirect("/dashboard/estimates");

  const { data: kits } = await supabase
    .from("install_kits")
    .select(`
      *,
      install_kit_items (
        id, pricebook_item_id, quantity, sort_order,
        pricebook_items ( id, display_name, unit_price, cost, category )
      )
    `)
    .order("name", { ascending: true });

  // Fetch pricebook items for the item picker
  const { data: pricebookItems } = await supabase
    .from("pricebook_items")
    .select("id, display_name, unit_price, cost, category, system_type, manufacturer, model_number")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  return (
    <div>
      <PageTopbar title="Install Kits" subtitle="Pre-built material bundles for the quote builder" />

      <InstallKitManager
        initialKits={kits || []}
        pricebookItems={pricebookItems || []}
      />
    </div>
  );
}
