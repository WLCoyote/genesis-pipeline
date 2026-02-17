import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";
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
    .select("name, role")
    .eq("id", user.id)
    .single();

  // If user exists in auth but not in our users table, they're not set up yet
  if (!dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Account Not Configured
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your Google account is authenticated, but you haven&apos;t been added
            to the Genesis Pipeline system yet. Ask your admin to add you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell role={dbUser.role as UserRole} userName={dbUser.name} userId={user.id}>
      {children}
    </DashboardShell>
  );
}
