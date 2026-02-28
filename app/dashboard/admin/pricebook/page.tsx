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

  // Fetch all pricebook items (including inactive for the toggle)
  const { data: items } = await supabase
    .from("pricebook_items")
    .select("*")
    .order("display_name", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pricebook
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage equipment, labor, materials, and add-ons. Synced with Housecall Pro.
        </p>
      </div>

      <PricebookManager initialItems={items || []} />
    </div>
  );
}
