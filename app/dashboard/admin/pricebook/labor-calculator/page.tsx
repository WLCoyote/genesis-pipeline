import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LaborCalculator from "@/app/components/LaborCalculator";
import PageTopbar from "@/app/components/ui/PageTopbar";

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
      <PageTopbar title="Labor Calculator" />

      <LaborCalculator initialInputs={setting?.value ?? null} />
    </div>
  );
}
