import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LaborCalculator from "@/app/components/LaborCalculator";

export default async function LaborCalculatorPage() {
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

  // Read saved inputs from settings
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "labor_calculator")
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Labor Calculator
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Calculate fully loaded labor cost and target hourly rate. Inputs are saved across sessions.
        </p>
      </div>

      <LaborCalculator initialInputs={setting?.value ?? null} />
    </div>
  );
}
