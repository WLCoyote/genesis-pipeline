import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import PipelineCards from "@/app/components/PipelineCards";
import EstimateTable from "@/app/components/EstimateTable";

export default async function AdminPage() {
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

  // Get status counts
  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      `
      id,
      estimate_number,
      status,
      total_amount,
      sent_date,
      customer_id,
      assigned_to,
      customers ( name ),
      users!estimates_assigned_to_fkey ( name ),
      follow_up_events ( status, sent_at, channel )
    `
    )
    .order("sent_date", { ascending: true });

  const allEstimates = (estimates || []) as any[];

  // Compute status counts
  const statusCounts: Record<string, number> = {};
  let totalValue = 0;
  for (const est of allEstimates) {
    statusCounts[est.status] = (statusCounts[est.status] || 0) + 1;
    totalValue += est.total_amount || 0;
  }

  const counts = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Transform for table
  const rows = allEstimates.map((est) => {
    const events = est.follow_up_events || [];
    return {
      id: est.id,
      estimate_number: est.estimate_number,
      status: est.status,
      total_amount: est.total_amount,
      sent_date: est.sent_date,
      customer_name: est.customers?.name || "Unknown",
      assigned_to_name: est.users?.name || null,
      emails_sent: events.filter(
        (e: any) => e.channel === "email" && e.status === "sent"
      ).length,
      sms_sent: events.filter(
        (e: any) => e.channel === "sms" && e.status === "sent"
      ).length,
      calls_made: events.filter(
        (e: any) => e.channel === "call" && e.status === "completed"
      ).length,
      opens: events.filter(
        (e: any) => e.channel === "email" && e.status === "opened"
      ).length,
      last_contacted: (() => {
        const dates = events
          .filter(
            (e: any) =>
              e.sent_at && ["sent", "completed", "opened"].includes(e.status)
          )
          .map((e: any) => e.sent_at)
          .sort()
          .reverse();
        return dates[0] || null;
      })(),
      has_pending_action: events.some(
        (e: any) => e.status === "scheduled" || e.status === "pending_review"
      ),
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          All estimates across your team
        </p>
      </div>

      <div className="mb-6">
        <PipelineCards counts={counts} totalValue={totalValue} />
      </div>

      <EstimateTable estimates={rows} role={"admin" as UserRole} />
    </div>
  );
}
