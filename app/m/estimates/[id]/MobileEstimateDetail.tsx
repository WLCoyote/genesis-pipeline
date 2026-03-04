"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/app/components/StatusBadge";
import ConversationThread from "@/app/components/ConversationThread";
import CustomerInfo from "@/app/components/CustomerInfo";
import LineItemsView from "@/app/components/LineItemsView";
import OptionsList from "@/app/components/OptionsList";
import ProposalEngagementPanel from "@/app/components/ProposalEngagementPanel";
import { EstimateStatus } from "@/lib/types";

interface MobileEstimateDetailProps {
  estimateId: string;
  estimate: {
    estimate_number: string;
    status: EstimateStatus;
    total_amount: number | null;
    sent_date: string | null;
    snooze_note: string | null;
    snooze_until: string | null;
    proposal_token: string | null;
    proposal_signed_at: string | null;
    proposal_signed_name: string | null;
    proposal_pdf_url: string | null;
    sequence_step_index: number;
    selected_tier: number | null;
    subtotal: number | null;
    tax_amount: number | null;
    tax_rate: number | null;
  };
  customer: any;
  events: any[];
  lineItems: any[];
  engagements: any[];
  messages: any[];
  isAdmin: boolean;
  sequenceSteps: any[] | null;
  sequenceIsActive: boolean;
  nextDueStep: { day_offset: number; channel: string; step_index: number; is_call_task: boolean } | null;
  options: any[];
}

export default function MobileEstimateDetail({
  estimateId,
  estimate,
  customer,
  events,
  lineItems,
  engagements,
  messages,
  isAdmin,
  sequenceSteps,
  sequenceIsActive,
  nextDueStep,
  options,
}: MobileEstimateDetailProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>("sms");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isTerminal = estimate.status === "won" || estimate.status === "lost";
  const hasPipelineLineItems = lineItems.length > 0;

  // Quick action handlers
  const handleStatusChange = async (newStatus: "won" | "lost") => {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
      else alert("Failed to update status.");
    } catch {
      alert("Network error.");
    }
    setActionLoading(null);
  };

  const handleSendNext = async () => {
    if (!nextDueStep) return;
    setActionLoading("send");
    try {
      const res = await fetch(`/api/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          step_index: nextDueStep.step_index,
        }),
      });
      if (res.ok) router.refresh();
      else alert("Failed to send.");
    } catch {
      alert("Network error.");
    }
    setActionLoading(null);
  };

  const handleSkipStep = async () => {
    if (!nextDueStep) return;
    setActionLoading("skip");
    try {
      const res = await fetch(`/api/estimates/${estimateId}/skip-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_index: nextDueStep.step_index }),
      });
      if (res.ok) router.refresh();
      else alert("Failed to skip.");
    } catch {
      alert("Network error.");
    }
    setActionLoading(null);
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => router.push("/m/pipeline")}
            className="text-ds-blue text-sm font-semibold cursor-pointer"
          >
            ← Back
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-semibold text-ds-text dark:text-gray-100">
              {customer?.name || "Unknown"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-ds-gray">#{estimate.estimate_number}</span>
              <StatusBadge status={estimate.status} />
            </div>
          </div>
          {estimate.total_amount != null && (
            <span className="text-xl font-display font-semibold text-ds-text dark:text-gray-100">
              ${estimate.total_amount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Signed badge */}
        {estimate.proposal_signed_at && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-ds-green-bg text-ds-green text-xs font-bold rounded-md">
            Signed {new Date(estimate.proposal_signed_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Quick Action Strip */}
      {!isTerminal && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {customer?.phone && (
            <button
              onClick={handleCall}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold whitespace-nowrap cursor-pointer active:bg-green-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </button>
          )}
          {nextDueStep && (
            <button
              onClick={handleSendNext}
              disabled={actionLoading === "send"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold whitespace-nowrap cursor-pointer active:bg-blue-100 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Next
            </button>
          )}
          {nextDueStep && (
            <button
              onClick={handleSkipStep}
              disabled={actionLoading === "skip"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap cursor-pointer active:bg-gray-200 disabled:opacity-50"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => handleStatusChange("won")}
            disabled={actionLoading === "won"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold whitespace-nowrap cursor-pointer active:bg-green-100 disabled:opacity-50"
          >
            Won
          </button>
          <button
            onClick={() => handleStatusChange("lost")}
            disabled={actionLoading === "lost"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold whitespace-nowrap cursor-pointer active:bg-red-100 disabled:opacity-50"
          >
            Lost
          </button>
          {estimate.proposal_token && (
            <a
              href={`/proposals/${estimate.proposal_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold whitespace-nowrap no-underline active:bg-orange-100"
            >
              View Proposal
            </a>
          )}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="px-4 mt-3 space-y-2">
        {/* SMS Conversation */}
        <CollapsibleSection
          title="Messages"
          isOpen={activeSection === "sms"}
          onToggle={() => toggleSection("sms")}
          badge={messages.length > 0 ? `${messages.length}` : undefined}
        >
          <ConversationThread
            estimateId={estimateId}
            customerId={customer?.id}
            customerPhone={customer?.phone || null}
            initialMessages={messages}
          />
        </CollapsibleSection>

        {/* Customer Info */}
        <CollapsibleSection
          title="Customer"
          isOpen={activeSection === "customer"}
          onToggle={() => toggleSection("customer")}
        >
          <CustomerInfo customer={customer} />
        </CollapsibleSection>

        {/* Line Items / Options */}
        <CollapsibleSection
          title="Line Items"
          isOpen={activeSection === "items"}
          onToggle={() => toggleSection("items")}
        >
          {hasPipelineLineItems ? (
            <LineItemsView
              lineItems={lineItems}
              totalAmount={estimate.total_amount}
              subtotal={estimate.subtotal}
              taxAmount={estimate.tax_amount}
              taxRate={estimate.tax_rate}
              selectedTier={estimate.selected_tier}
            />
          ) : (
            <OptionsList options={options} totalAmount={estimate.total_amount} />
          )}
        </CollapsibleSection>

        {/* Proposal Activity */}
        {estimate.proposal_token && (
          <CollapsibleSection
            title="Proposal Activity"
            isOpen={activeSection === "engagement"}
            onToggle={() => toggleSection("engagement")}
          >
            <ProposalEngagementPanel
              engagements={engagements}
              proposalSignedAt={estimate.proposal_signed_at}
              proposalSignedName={estimate.proposal_signed_name}
              proposalPdfUrl={estimate.proposal_pdf_url}
            />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ds-text dark:text-gray-100 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-full bg-ds-blue/10 text-ds-blue text-[10px] font-bold">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  );
}
