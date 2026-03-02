import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FinancingPlanManager from "@/app/components/FinancingPlanManager";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function FinancingPlansPage() {
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

  const { data: plans } = await supabase
    .from("financing_plans")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div>
      <PageTopbar title="Financing Plans" />

      <FinancingPlanManager initialPlans={plans || []} />
    </div>
  );
}
