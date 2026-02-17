import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";
import EstimateTable from "@/app/components/EstimateTable";
import UpdateEstimatesButton from "@/app/components/UpdateEstimatesButton";

export default async function EstimatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get current user's role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  const role = dbUser.role as UserRole;

  // Build estimate query with joins
  let query = supabase
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

  // RLS handles row-level filtering, but comfort_pro only sees their own
  // (enforced by RLS policy on estimates table)

  const { data: estimates, error } = await query;

  if (error) {
    console.error("Error fetching estimates:", error);
    return (
      <div className="text-center py-12 text-red-500 text-sm">
        Failed to load estimates.
      </div>
    );
  }

  // Transform joined data into flat rows for the table
  const rows = (estimates || []).map((est: any) => {
    const events = est.follow_up_events || [];

    const emailsSent = events.filter(
      (e: any) => e.channel === "email" && e.status === "sent"
    ).length;
    const smsSent = events.filter(
      (e: any) => e.channel === "sms" && e.status === "sent"
    ).length;
    const callsMade = events.filter(
      (e: any) => e.channel === "call" && e.status === "completed"
    ).length;
    const opens = events.filter(
      (e: any) => e.channel === "email" && e.status === "opened"
    ).length;

    // Last contacted = most recent sent_at across all sent/completed events
    const contactDates = events
      .filter(
        (e: any) =>
          e.sent_at && ["sent", "completed", "opened"].includes(e.status)
      )
      .map((e: any) => e.sent_at)
      .sort()
      .reverse();

    // Has pending action = any scheduled call tasks or pending_review events
    const hasPendingAction = events.some(
      (e: any) =>
        e.status === "scheduled" ||
        e.status === "pending_review"
    );

    return {
      id: est.id,
      estimate_number: est.estimate_number,
      status: est.status,
      total_amount: est.total_amount,
      sent_date: est.sent_date,
      customer_name: est.customers?.name || "Unknown",
      assigned_to_name: est.users?.name || null,
      emails_sent: emailsSent,
      sms_sent: smsSent,
      calls_made: callsMade,
      opens,
      last_contacted: contactDates[0] || null,
      has_pending_action: hasPendingAction,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estimates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {role === "admin"
              ? "All estimates across your team"
              : "Your assigned estimates"}
          </p>
        </div>
        {["admin", "csr"].includes(role) && <UpdateEstimatesButton />}
      </div>
      <EstimateTable estimates={rows} role={role} />
    </div>
  );
}
