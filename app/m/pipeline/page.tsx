import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth-cache";
import { createClient } from "@/lib/supabase/server";
import MobilePipelineList from "./MobilePipelineList";

export default async function MobilePipelinePage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const supabase = await createClient();

  let query = supabase
    .from("estimates")
    .select(
      `
      id,
      estimate_number,
      status,
      total_amount,
      sent_date,
      assigned_to,
      customers ( name ),
      follow_up_events ( status, sent_at, channel )
    `
    )
    .order("sent_date", { ascending: false });

  if (!isAdmin) {
    query = query.eq("assigned_to", user.id);
  }

  const { data: estimates } = await query;

  const rows = (estimates || []).map((est: any) => {
    const events = est.follow_up_events || [];
    const contactDates = events
      .filter(
        (e: any) =>
          e.sent_at && ["sent", "completed", "opened"].includes(e.status)
      )
      .map((e: any) => e.sent_at)
      .sort()
      .reverse();

    return {
      id: est.id,
      estimate_number: est.estimate_number,
      status: est.status,
      total_amount: est.total_amount,
      sent_date: est.sent_date,
      customer_name: est.customers?.name || "Unknown",
      last_contacted: contactDates[0] || null,
    };
  });

  return <MobilePipelineList estimates={rows} />;
}
