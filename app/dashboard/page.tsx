import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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

  // Role-based redirect
  switch (dbUser?.role) {
    case "admin":
      redirect("/dashboard/estimates");
    case "csr":
      redirect("/dashboard/leads");
    case "comfort_pro":
    default:
      redirect("/dashboard/estimates");
  }
}
