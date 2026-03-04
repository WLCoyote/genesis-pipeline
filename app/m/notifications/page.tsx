import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNotificationList from "./MobileNotificationList";

export default async function MobileNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
