import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import InboxThreads from "@/app/components/InboxThreads";
import PageTopbar from "@/app/components/ui/PageTopbar";

export default async function InboxPage() {
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

  const role = dbUser?.role as UserRole;
  if (!["admin", "csr"].includes(role)) redirect("/dashboard/estimates");

  return (
    <div>
      <PageTopbar title="SMS Inbox" />

      <InboxThreads />
    </div>
  );
}
