"use client";

import { useRouter } from "next/navigation";
import { EstimateStatus } from "@/lib/types";
import StatusBadge from "../StatusBadge";

export interface EstimateRow {
  id: string;
  estimate_number: string;
  status: EstimateStatus;
  total_amount: number | null;
  sent_date: string | null;
  customer_name: string;
  customer_address: string | null;
  assigned_to_name: string | null;
  hcp_estimate_id: string | null;
  emails_sent: number;
  sms_sent: number;
  calls_made: number;
  opens: number;
  last_contacted: string | null;
  has_pending_action: boolean;
}

// --- Avatar color logic ---
const AVATAR_COLORS = [
  "from-[#1565c0] to-[#1e88e5]", // blue
  "from-[#2e7d32] to-[#43a047]", // green
  "from-[#e65100] to-[#ff6d00]", // orange
  "from-[#6a1b9a] to-[#9c27b0]", // purple
  "from-[#00695c] to-[#00897b]", // teal
  "from-[#c62828] to-[#e53935]", // red
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// --- Follow-up urgency logic ---
export function getFollowUpStatus(estimate: EstimateRow): { label: string; type: "overdue" | "today" | "soon" | "ok" } {
  if (estimate.status === "won") return { label: "Closed", type: "ok" };
  if (estimate.status === "lost") return { label: "Lost", type: "ok" };

  const lastContact = estimate.last_contacted || estimate.sent_date;
  if (!lastContact) return { label: "No contact", type: "overdue" };

  const daysSince = Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000);
  if (daysSince > 3) return { label: `${daysSince}d overdue`, type: "overdue" };
  if (daysSince === 3) return { label: "Follow up today", type: "today" };
  if (daysSince >= 1) return { label: daysSince === 2 ? "Tomorrow" : "In 2 days", type: "soon" };
  return { label: "Contacted", type: "ok" };
}

const urgencyStyles: Record<string, string> = {
  overdue: "bg-ds-red-bg text-ds-red dark:bg-red-900/30 dark:text-red-400",
  today: "bg-ds-orange-bg text-ds-orange dark:bg-orange-900/30 dark:text-orange-400",
  soon: "bg-ds-yellow-bg text-[#795500] dark:bg-yellow-900/30 dark:text-yellow-400",
  ok: "bg-ds-green-bg text-ds-green dark:bg-green-900/30 dark:text-green-400",
};

// --- Formatters ---
function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAmount(amount: number | null): string {
  if (!amount) return "\u2014";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

// --- Pipeline row ---
interface PipelineRowProps {
  estimate: EstimateRow;
  isAdmin: boolean;
}

export function PipelineRow({ estimate, isAdmin }: PipelineRowProps) {
  const router = useRouter();
  const fu = getFollowUpStatus(estimate);
  const avatarColor = getAvatarColor(estimate.customer_name);
  const initials = getInitials(estimate.customer_name);

  return (
    <div
      onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
      className="grid items-center px-5 py-3 border-b border-ds-border dark:border-gray-700 last:border-b-0 hover:bg-[#f7f9fd] dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
      style={{ gridTemplateColumns: "2.2fr 1fr 0.9fr 0.8fr 0.9fr 1.1fr 1fr" }}
    >
      {/* Customer */}
      <div className="flex items-center gap-2.5">
        <div
          className={`w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center text-[13px] font-black text-white bg-gradient-to-br ${avatarColor}`}
        >
          {initials}
        </div>
        <div>
          <div className="text-[14px] font-bold text-ds-text dark:text-gray-100 leading-tight">
            {estimate.customer_name}
          </div>
          <div className="text-[11px] text-ds-gray-lt dark:text-gray-500 mt-px">
            #{estimate.estimate_number}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="font-display text-lg font-extrabold text-ds-text dark:text-gray-100">
        {formatAmount(estimate.total_amount)}
      </div>

      {/* Status */}
      <div>
        <StatusBadge status={estimate.status} />
      </div>

      {/* Sent */}
      <div className="text-[13px] text-ds-text-lt dark:text-gray-400">
        {formatDate(estimate.sent_date)}
      </div>

      {/* Follow-up urgency */}
      <div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold py-[3px] px-2 rounded-[6px] ${urgencyStyles[fu.type]}`}>
          {fu.label}
        </span>
      </div>

      {/* Assigned To */}
      <div className="flex items-center gap-[7px] text-[13px]">
        {estimate.assigned_to_name ? (
          <>
            <div className="w-6 h-6 rounded-md flex-shrink-0 bg-gradient-to-br from-ds-blue to-ds-blue-lt flex items-center justify-center text-[9px] font-black text-white">
              {getInitials(estimate.assigned_to_name)}
            </div>
            <span className="text-ds-text-lt dark:text-gray-400">{estimate.assigned_to_name.split(" ")[0]} {estimate.assigned_to_name.split(" ").pop()?.[0] || ""}.</span>
          </>
        ) : isAdmin ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-ds-blue font-bold bg-transparent border-none cursor-pointer py-0.5 px-1.5 rounded-[5px] hover:bg-ds-blue-bg dark:hover:bg-blue-900/30 transition-colors"
          >
            + Assign
          </button>
        ) : (
          <span className="text-ds-gray-lt dark:text-gray-500 italic text-xs">Unassigned</span>
        )}
      </div>

      {/* Actions (hover-reveal) */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/estimates/${estimate.id}`);
          }}
          className="text-[11px] font-bold py-1 px-2.5 rounded-[6px] bg-ds-bg dark:bg-gray-700 text-ds-gray dark:text-gray-400 border border-ds-border dark:border-gray-600 hover:border-ds-blue hover:text-ds-blue dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          View
        </button>
        {estimate.status !== "won" && estimate.status !== "lost" && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-bold py-1 px-2.5 rounded-[6px] bg-ds-blue text-white hover:bg-ds-blue-lt transition-colors cursor-pointer border-none"
          >
            Resend
          </button>
        )}
      </div>
    </div>
  );
}

// --- Unsent row ---
interface UnsentRowProps {
  estimate: EstimateRow;
  isAdmin: boolean;
}

export function UnsentRow({ estimate, isAdmin }: UnsentRowProps) {
  const router = useRouter();
  const avatarColor = getAvatarColor(estimate.customer_name);
  const initials = getInitials(estimate.customer_name);

  return (
    <div
      onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
      className="grid items-center px-5 py-3 border-b border-ds-border dark:border-gray-700 last:border-b-0 hover:bg-[#f7f9fd] dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
      style={{ gridTemplateColumns: "2fr 2fr 1fr 1.2fr 0.8fr 1fr" }}
    >
      {/* Customer */}
      <div className="flex items-center gap-2.5">
        <div
          className={`w-[34px] h-[34px] rounded-[9px] flex-shrink-0 flex items-center justify-center text-[13px] font-black text-white bg-gradient-to-br ${avatarColor}`}
        >
          {initials}
        </div>
        <div>
          <div className="text-[14px] font-bold text-ds-text dark:text-gray-100 leading-tight">
            {estimate.customer_name}
          </div>
          <div className="text-[11px] text-ds-gray-lt dark:text-gray-500 mt-px">
            #{estimate.estimate_number}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="text-[13px] text-ds-text-lt dark:text-gray-400">
        {estimate.customer_address || "\u2014"}
      </div>

      {/* Created */}
      <div className="text-[13px] text-ds-text-lt dark:text-gray-400">
        {formatDate(estimate.sent_date)}
      </div>

      {/* Assigned To */}
      <div className="flex items-center gap-[7px] text-[13px]">
        {estimate.assigned_to_name ? (
          <>
            <div className="w-6 h-6 rounded-md flex-shrink-0 bg-gradient-to-br from-ds-blue to-ds-blue-lt flex items-center justify-center text-[9px] font-black text-white">
              {getInitials(estimate.assigned_to_name)}
            </div>
            <span className="text-ds-text-lt dark:text-gray-400">{estimate.assigned_to_name.split(" ")[0]} {estimate.assigned_to_name.split(" ").pop()?.[0] || ""}.</span>
          </>
        ) : isAdmin ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-ds-blue font-bold bg-transparent border-none cursor-pointer py-0.5 px-1.5 rounded-[5px] hover:bg-ds-blue-bg dark:hover:bg-blue-900/30 transition-colors"
          >
            + Assign
          </button>
        ) : (
          <span className="text-ds-gray-lt dark:text-gray-500 italic text-xs">Unassigned</span>
        )}
      </div>

      {/* Status */}
      <div>
        <StatusBadge status={estimate.status} />
      </div>

      {/* Action */}
      <div className="text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/quote-builder?estimate_id=${estimate.id}`);
          }}
          className="px-3 py-1.5 text-xs font-bold rounded-md bg-ds-orange text-white hover:bg-[#ff6d00] transition-colors cursor-pointer border-none"
        >
          Build Quote
        </button>
      </div>
    </div>
  );
}
