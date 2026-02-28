import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FinancingPlanManager from "@/app/components/FinancingPlanManager";

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Financing Plans
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Synchrony / GreenSky financing options shown on proposals. Monthly payment = total ÷ (1 − fee%) ÷ months.
        </p>
      </div>

      <FinancingPlanManager initialPlans={plans || []} />
    </div>
  );
}
