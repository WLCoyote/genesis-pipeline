import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamMemberList from "@/app/components/TeamMemberList";
import { User, UserInvite } from "@/lib/types";
import PageTopbar from "@/app/components/ui/PageTopbar";

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
      <PageTopbar title="Team" />

      <TeamMemberList
        users={(users || []) as User[]}
        invites={(invites || []) as UserInvite[]}
        currentUserId={user.id}
      />
    </div>
  );
}
