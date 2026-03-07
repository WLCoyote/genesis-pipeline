import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import { UserRole } from "@/lib/types";
import MobileShell from "./MobileShell";
import PendingApproval from "@/app/components/PendingApproval";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.is_active) {
    return <PendingApproval message="Your account is pending approval. An admin will review and activate your access shortly." />;
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
