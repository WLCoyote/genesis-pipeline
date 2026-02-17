import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamMemberList from "@/app/components/TeamMemberList";
import { User, UserInvite } from "@/lib/types";

export default async function TeamPage() {
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

  if (dbUser?.role !== "admin") redirect("/dashboard/estimates");

  // Fetch all users and pending invites
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: invites } = await supabase
    .from("user_invites")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage team members and invite new users
        </p>
      </div>

      <TeamMemberList
        users={(users || []) as User[]}
        invites={(invites || []) as UserInvite[]}
        currentUserId={user.id}
      />
    </div>
  );
}
