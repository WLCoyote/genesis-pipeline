import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import { createClient } from "@/lib/supabase/server";
import MobileInboxList from "./MobileInboxList";

export default async function MobileInboxPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const supabase = await createClient();

  let estQuery = supabase
    .from("estimates")
    .select("id, estimate_number, customers(name)")
    .neq("status", "draft");

  if (!isAdmin) {
    estQuery = estQuery.eq("assigned_to", user.id);
  }

  const { data: estimates } = await estQuery;

  const estMap = new Map<
    string,
    { estimate_number: string; customer_name: string }
  >();
  for (const est of estimates || []) {
    estMap.set(est.id, {
      estimate_number: est.estimate_number,
      customer_name: (est as any).customers?.name || "Unknown",
    });
  }

  if (estMap.size === 0) {
    return <MobileInboxList threads={[]} userId={user.id} />;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("estimate_id, direction, body, created_at")
    .in("estimate_id", Array.from(estMap.keys()))
    .eq("channel", "sms")
    .order("created_at", { ascending: false })
    .limit(500);

  const seen = new Set<string>();
  const threads: Array<{
    estimate_id: string;
    estimate_number: string;
    customer_name: string;
    last_message: string;
    last_message_at: string;
    unread: boolean;
  }> = [];

  for (const msg of messages || []) {
    if (!msg.estimate_id || seen.has(msg.estimate_id)) continue;
    seen.add(msg.estimate_id);
    const est = estMap.get(msg.estimate_id);
    if (!est) continue;
    threads.push({
      estimate_id: msg.estimate_id,
      estimate_number: est.estimate_number,
      customer_name: est.customer_name,
      last_message: msg.body,
      last_message_at: msg.created_at,
      unread: msg.direction === "inbound",
    });
  }

  return <MobileInboxList threads={threads} userId={user.id} />;
}
