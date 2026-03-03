import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommissionDashboard from "@/app/components/CommissionDashboard";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function CommissionPage() {
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

  // Only admin and comfort_pro can access
  if (!dbUser || !["admin", "comfort_pro"].includes(dbUser.role)) {
    redirect("/dashboard/estimates");
  }

  const isAdmin = dbUser.role === "admin";

  // Fetch team members for admin filter
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
    <div>
      <PageTopbar
        title="Commission"
        subtitle={isAdmin ? "All team members" : "Your commission earnings"}
      />
      <CommissionDashboard
        userId={user.id}
        isAdmin={isAdmin}
        teamMembers={teamMembers}
      />
    </div>
  );
}
