import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import { UserRole } from "@/lib/types";
import MobileShell from "./MobileShell";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.role as UserRole;

  // Only comfort_pro and admin can access mobile app
  if (role === "csr") {
    redirect("/dashboard/estimates");
  }

  return (
    <MobileShell role={role} userName={user.name} userId={user.id}>
      {children}
    </MobileShell>
  );
}
