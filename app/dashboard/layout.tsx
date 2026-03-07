import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";
import PendingApproval from "@/app/components/PendingApproval";
import { UserRole } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile from our users table
  const { data: dbUser } = await supabase
    .from("users")
    .select("name, role, is_active")
    .eq("id", user.id)
    .single();

  // If user exists in auth but not in our users table, they're not set up yet
  if (!dbUser) {
    return <PendingApproval message="Your Google account is authenticated, but you haven't been added to the Genesis Pipeline system yet. Ask your admin to add you." />;
  }

  // User exists but hasn't been approved yet
  if (!dbUser.is_active) {
    return <PendingApproval message="Your account is pending approval. An admin will review and activate your access shortly." />;
  }

  return (
    <DashboardShell role={dbUser.role as UserRole} userName={dbUser.name} userId={user.id}>
      {children}
    </DashboardShell>
  );
}
