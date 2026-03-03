import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommissionTierManager from "@/app/components/CommissionTierManager";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function CommissionTiersPage() {
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
    .from("commission_tiers")
    .select("*")
    .order("min_revenue", { ascending: true });

  return (
    <div>
      <PageTopbar title="Commission Tiers" />
      <CommissionTierManager initialTiers={tiers || []} />
    </div>
  );
}
