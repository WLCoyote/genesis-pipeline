import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/app/components/StatusBadge";
import CustomerInfo from "@/app/components/CustomerInfo";
import OptionsList from "@/app/components/OptionsList";
import LineItemsView from "@/app/components/LineItemsView";
import ProposalEngagementPanel from "@/app/components/ProposalEngagementPanel";
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

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = dbUser?.role === "admin";

  // Fetch estimate with all related data including sequence
  const { data: estimate, error } = await supabase
    .from("estimates")
    .select(
      `
      *,
      customers (*),
      users!estimates_assigned_to_fkey ( id, name, email ),
      estimate_options (*),
      estimate_line_items (*),
      follow_up_events (*),
      follow_up_sequences (steps, is_active),
      proposal_engagement (*)
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
  const lineItems = est.estimate_line_items || [];
  const events = est.follow_up_events || [];
  const engagements = est.proposal_engagement || [];
  const hasPipelineLineItems = lineItems.length > 0;

  // Find the next pending_review event (editable message)
  const pendingEvent =
    events.find((e: any) => e.status === "pending_review") || null;

  // Compute next due step for "Send Now" button
  let nextDueStep: { day_offset: number; channel: string; step_index: number; is_call_task: boolean } | null = null;
  const sequenceSteps = (est.follow_up_sequences as any)?.steps as Array<{
    day_offset: number; channel: string; is_call_task: boolean;
  }> | undefined;
  const sequenceIsActive = (est.follow_up_sequences as any)?.is_active !== false;

  if (est.status === "active" && sequenceSteps && est.sent_date) {
    const stepIndex = est.sequence_step_index || 0;
    if (stepIndex < sequenceSteps.length) {
      const step = sequenceSteps[stepIndex];
      const sentDate = new Date(est.sent_date);
      const dueDate = new Date(sentDate);
      dueDate.setDate(dueDate.getDate() + step.day_offset);

      // Step is due and no event exists for it yet
      if (dueDate <= new Date()) {
        const hasEvent = events.some(
          (e: any) => e.sequence_step_index === stepIndex
        );
        if (!hasEvent) {
          nextDueStep = {
            day_offset: step.day_offset,
            channel: step.channel,
            step_index: stepIndex,
            is_call_task: step.is_call_task,
          };
        }
      }
    }
  }

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
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span>
            {(() => {
              const firstOptionId = options.find((o: any) => o.hcp_option_id)?.hcp_option_id;
              const hcpUrl = firstOptionId
                ? `https://pro.housecallpro.com/app/estimates/${firstOptionId}`
                : null;
              return hcpUrl ? (
                <a
                  href={hcpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Estimate #{est.estimate_number}
                </a>
              ) : (
                <>Estimate #{est.estimate_number}</>
              );
            })()}
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
          </span>
          {est.proposal_token && (
            <a
              href={`/proposals/${est.proposal_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              View Proposal
            </a>
          )}
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-4">
          <FollowUpTimeline
            estimateId={id}
            events={events}
            sequenceSteps={sequenceSteps || null}
            sentDate={est.sent_date || null}
            currentStepIndex={est.sequence_step_index || 0}
            estimateStatus={est.status}
            sequenceIsActive={sequenceIsActive}
          />
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
            isAdmin={isAdmin}
            nextDueStep={nextDueStep}
            currentStepIndex={est.sequence_step_index || 0}
            totalSteps={sequenceSteps?.length || 0}
            sequenceIsActive={sequenceIsActive}
            options={options}
          />
          <CustomerInfo customer={customer} />
          {hasPipelineLineItems ? (
            <LineItemsView
              lineItems={lineItems}
              totalAmount={est.total_amount}
              subtotal={est.subtotal}
              taxAmount={est.tax_amount}
              taxRate={est.tax_rate}
            />
          ) : (
            <OptionsList options={options} totalAmount={est.total_amount} />
          )}
          {est.proposal_token && (
            <ProposalEngagementPanel
              engagements={engagements}
              proposalSignedAt={est.proposal_signed_at}
              proposalSignedName={est.proposal_signed_name}
              proposalPdfUrl={est.proposal_pdf_url}
            />
          )}
        </div>
      </div>
    </div>
  );
}
