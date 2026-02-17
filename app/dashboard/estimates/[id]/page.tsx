import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/app/components/StatusBadge";
import CustomerInfo from "@/app/components/CustomerInfo";
import OptionsList from "@/app/components/OptionsList";
import FollowUpTimeline from "@/app/components/FollowUpTimeline";
import EstimateActions from "@/app/components/EstimateActions";
import ConversationThread from "@/app/components/ConversationThread";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch estimate with all related data
  const { data: estimate, error } = await supabase
    .from("estimates")
    .select(
      `
      *,
      customers (*),
      users!estimates_assigned_to_fkey ( id, name, email ),
      estimate_options (*),
      follow_up_events (*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !estimate) {
    notFound();
  }

  // Fetch SMS messages for this estimate
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("estimate_id", id)
    .order("created_at", { ascending: true });

  const est = estimate as any;
  const customer = est.customers;
  const options = est.estimate_options || [];
  const events = est.follow_up_events || [];

  // Find the next pending_review event (editable message)
  const pendingEvent =
    events.find((e: any) => e.status === "pending_review") || null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/estimates"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
        >
          &larr; Back to Estimates
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {customer?.name || "Unknown Customer"}
          </h1>
          <StatusBadge status={est.status} />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Estimate #{est.estimate_number}
          {est.total_amount !== null && (
            <span className="ml-3 font-medium text-gray-700 dark:text-gray-300">
              $
              {est.total_amount.toLocaleString("en-US", {
                minimumFractionDigits: 0,
              })}
            </span>
          )}
          {est.users?.name && (
            <span className="ml-3">Assigned to {est.users.name}</span>
          )}
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-4">
          <FollowUpTimeline events={events} />
          <ConversationThread
            estimateId={id}
            customerId={est.customer_id}
            customerPhone={customer?.phone || null}
            initialMessages={messages || []}
          />
        </div>

        {/* Right column — info + actions */}
        <div className="space-y-4">
          <EstimateActions
            estimateId={id}
            status={est.status}
            snoozeNote={est.snooze_note}
            snoozeUntil={est.snooze_until}
            pendingEvent={pendingEvent}
            onlineEstimateUrl={est.online_estimate_url || null}
          />
          <CustomerInfo customer={customer} />
          <OptionsList options={options} totalAmount={est.total_amount} />
        </div>
      </div>
    </div>
  );
}
