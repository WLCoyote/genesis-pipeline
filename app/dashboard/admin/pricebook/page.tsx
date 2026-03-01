import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PricebookManager from "@/app/components/PricebookManager";

export default async function PricebookPage() {
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

  // Fetch all pricebook items, categories, and suppliers
  const [{ data: items }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase
      .from("pricebook_items")
      .select("*")
      .order("display_name", { ascending: true }),
    supabase
      .from("pricebook_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("pricebook_suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  return (
    <PricebookManager
      initialItems={items || []}
      initialCategories={categories || []}
      initialSuppliers={suppliers || []}
    />
  );
}
