import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import MobileShell from "./MobileShell";

export default async function MobileLayout({
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (!dbUser) {
    redirect("/login");
  }

  const role = dbUser.role as UserRole;

  // Only comfort_pro and admin can access mobile app
  if (role === "csr") {
    redirect("/dashboard/estimates");
  }

  return (
    <MobileShell role={role} userName={dbUser.name} userId={user.id}>
      {children}
    </MobileShell>
  );
}
