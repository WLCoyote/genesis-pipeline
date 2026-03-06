import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import { createClient } from "@/lib/supabase/server";
import MobileNotificationList from "./MobileNotificationList";

export default async function MobileNotificationsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <MobileNotificationList
      userId={user.id}
      initialNotifications={notifications || []}
    />
  );
}
