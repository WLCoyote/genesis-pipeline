import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommissionDashboard from "@/app/components/CommissionDashboard";

export default async function MobileCommissionPage() {
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

  if (!dbUser) redirect("/login");

  const isAdmin = dbUser.role === "admin";

  let teamMembers: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .in("role", ["admin", "comfort_pro"])
      .eq("is_active", true)
      .order("name");
    teamMembers = users || [];
  }

  return (
    <div className="px-4 py-3">
      <h1 className="font-display text-lg font-semibold text-ds-text dark:text-gray-100 mb-3">
        Commission
      </h1>
      <CommissionDashboard
        userId={user.id}
        isAdmin={isAdmin}
        teamMembers={teamMembers}
      />
    </div>
  );
}
