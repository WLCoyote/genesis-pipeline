import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MaintenancePlanManager from "@/app/components/MaintenancePlanManager";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function MaintenancePlansPage() {
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
    .from("maintenance_plans")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <PageTopbar title="Maintenance Plans" subtitle="Recurring service plans for proposals" />

      <MaintenancePlanManager initialPlans={plans || []} />
    </div>
  );
}
