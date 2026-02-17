import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import InboxThreads from "@/app/components/InboxThreads";

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          SMS Inbox
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Unmatched text messages — respond, convert to a lead, or dismiss
        </p>
      </div>

      <InboxThreads />
    </div>
  );
}
