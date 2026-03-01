import { redirect } from "next/navigation";
import Link from "next/link";
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
  const query = supabase
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
      hcp_estimate_id,
      customers ( name, address ),
      users!estimates_assigned_to_fkey ( name ),
      follow_up_events ( status, sent_at, channel )
    `
    )
    .order("sent_date", { ascending: false });

  const { data: estimates, error } = await query;

  if (error) {
    console.error("Error fetching estimates:", error);
    return (
      <div className="text-center py-12 text-ds-red text-sm">
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

    const contactDates = events
      .filter(
        (e: any) =>
          e.sent_at && ["sent", "completed", "opened"].includes(e.status)
      )
      .map((e: any) => e.sent_at)
      .sort()
      .reverse();

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
      customer_address: est.customers?.address || null,
      assigned_to_name: est.users?.name || null,
      hcp_estimate_id: est.hcp_estimate_id || null,
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
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-6 -mt-6 mb-5">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl font-black tracking-[1px] uppercase text-ds-text dark:text-gray-100">
            Estimates
          </h1>
          <span className="text-xs text-ds-gray dark:text-gray-500">
            {role === "admin"
              ? "All estimates across your team"
              : "Your assigned estimates"}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/quote-builder"
            className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold bg-ds-blue text-white shadow-[0_3px_10px_rgba(21,101,192,0.3)] hover:bg-ds-blue-lt transition-colors no-underline"
          >
            New Quote
          </Link>
          {["admin", "csr", "comfort_pro"].includes(role) && <UpdateEstimatesButton />}
        </div>
      </div>

      <EstimateTable estimates={rows} role={role} />
    </div>
  );
}
