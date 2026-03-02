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
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-5">
        <h1 className="font-display text-[22px] font-black uppercase tracking-[1px] text-ds-text dark:text-gray-100">
          Team
        </h1>
      </div>

      <TeamMemberList
        users={(users || []) as User[]}
        invites={(invites || []) as UserInvite[]}
        currentUserId={user.id}
      />
    </div>
  );
}
