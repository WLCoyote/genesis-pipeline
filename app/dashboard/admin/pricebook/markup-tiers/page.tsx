import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkupTiersEditor from "@/app/components/MarkupTiersEditor";

export default async function MarkupTiersPage() {
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

  const { data: tiers } = await supabase
    .from("markup_tiers")
    .select("*")
    .order("tier_number", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Markup Tiers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cost-based multipliers for auto-suggesting retail price on equipment, materials, and add-ons.
        </p>
      </div>

      <MarkupTiersEditor initialTiers={tiers || []} />
    </div>
  );
}
