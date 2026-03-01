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

  const isTerminal = est.status === "won" || est.status === "lost";

  return (
    <div>
      {/* Topbar */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 -mx-6 -mt-6 mb-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/estimates"
            className="px-3 py-1.5 rounded-[7px] text-[13px] font-bold border border-ds-border dark:border-gray-600 text-ds-blue hover:bg-ds-blue-bg hover:border-ds-blue transition-colors no-underline"
          >
            ← Back
          </Link>
          <h1 className="font-display text-[22px] font-black uppercase tracking-[1px] text-ds-text dark:text-gray-100">
            {customer?.name || "Unknown Customer"}
          </h1>
          <StatusBadge status={est.status} />
          <div className="hidden sm:flex items-center gap-2 text-[12px] text-ds-gray dark:text-gray-500">
            <span className="w-px h-4 bg-ds-border dark:bg-gray-600" />
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
                  className="text-ds-blue font-bold hover:underline"
                >
                  #{est.estimate_number}
                </a>
              ) : (
                <span>#{est.estimate_number}</span>
              );
            })()}
            {est.total_amount !== null && (
              <span className="font-bold text-ds-text dark:text-gray-300">
                ${est.total_amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            )}
            {est.users?.name && (
              <span>→ {est.users.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {est.proposal_token && (
            <a
              href={`/proposals/${est.proposal_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold border border-ds-border dark:border-gray-600 text-ds-gray hover:border-ds-blue hover:text-ds-blue transition-colors no-underline"
            >
              Preview Proposal
            </a>
          )}
          {est.proposal_pdf_url && (
            <a
              href={est.proposal_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold bg-ds-green text-white hover:brightness-110 transition-all no-underline"
            >
              Signed PDF
            </a>
          )}
          {hasPipelineLineItems && !est.proposal_signed_at && (
            <Link
              href={`/dashboard/quote-builder?estimate_id=${id}`}
              className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold bg-ds-orange text-white shadow-[0_3px_10px_rgba(230,81,0,0.25)] hover:bg-[#ff6d00] transition-colors no-underline"
            >
              Edit Quote
            </Link>
          )}
          {est.proposal_signed_at && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ds-green-bg dark:bg-green-900/30 text-ds-green dark:text-green-400 text-[12px] font-bold rounded-[7px]">
              ✍️ Signed {new Date(est.proposal_signed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Paused / snoozed banner */}
      {!sequenceIsActive && !isTerminal && (
        <div className="bg-gradient-to-r from-ds-yellow-bg to-[#fffde7] border-b border-ds-yellow/40 px-7 py-2.5 flex items-center gap-2.5 -mx-6">
          <span className="text-[13px]">⏸</span>
          <span className="text-[12px] text-[#795500] dark:text-yellow-300 font-bold">
            Sequence is paused — no follow-ups will be sent.
          </span>
          <Link
            href="/dashboard/admin/sequences"
            className="text-[12px] text-ds-blue font-bold hover:underline ml-1"
          >
            Resume in Admin →
          </Link>
        </div>
      )}

      {/* Two-column layout: main + right rail */}
      <div className="flex flex-col lg:flex-row">
        {/* Left column — main content */}
        <div className="flex-1 space-y-4 py-5 pr-0 lg:pr-5">
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

        {/* Right rail */}
        <div className="w-full lg:w-80 shrink-0 bg-ds-card dark:bg-gray-800 lg:border-l border-t lg:border-t-0 border-ds-border dark:border-gray-700 lg:-mr-6 lg:-my-0">
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
              selectedTier={est.selected_tier ?? null}
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
