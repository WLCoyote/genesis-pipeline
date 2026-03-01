"use client";

import { PipelineRow, UnsentRow, type EstimateRow } from "./EstimateTableRow";

// --- Pipeline table ---
interface PipelineTableProps {
  estimates: EstimateRow[];
  isAdmin: boolean;
  page: number;
  onPageChange: (p: number) => void;
  pageSize?: number;
}

export function PipelineTable({ estimates, isAdmin, page, onPageChange, pageSize = 10 }: PipelineTableProps) {
  const totalPages = Math.max(1, Math.ceil(estimates.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = estimates.slice(start, start + pageSize);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl overflow-hidden shadow-ds">
        {/* Header */}
        <div
          className="grid px-5 py-2.5 bg-ds-bg dark:bg-gray-700 border-b border-ds-border dark:border-gray-600"
          style={{ gridTemplateColumns: "2.2fr 1fr 0.9fr 0.8fr 0.9fr 1.1fr 1fr" }}
        >
          {["Customer", "Amount", "Status", "Sent", "Follow-up", "Assigned To", "Actions"].map((h) => (
            <div
              key={h}
              className="text-[10px] uppercase tracking-[2px] text-ds-gray dark:text-gray-400 font-black select-none"
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {paged.map((est) => (
          <PipelineRow key={est.id} estimate={est} isAdmin={isAdmin} />
        ))}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={estimates.length}
          pageSize={pageSize}
          onPageChange={onPageChange}
          label="estimates"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paged.map((est) => (
          <PipelineMobileCard key={est.id} estimate={est} />
        ))}
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={estimates.length}
              pageSize={pageSize}
              onPageChange={onPageChange}
              label="estimates"
              compact
            />
          </div>
        )}
      </div>
    </>
  );
}

// --- Unsent table ---
interface UnsentTableProps {
  estimates: EstimateRow[];
  isAdmin: boolean;
  page: number;
  onPageChange: (p: number) => void;
  pageSize?: number;
}

export function UnsentTable({ estimates, isAdmin, page, onPageChange, pageSize = 10 }: UnsentTableProps) {
  const totalPages = Math.max(1, Math.ceil(estimates.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = estimates.slice(start, start + pageSize);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl overflow-hidden shadow-ds">
        {/* Header */}
        <div
          className="grid px-5 py-2.5 bg-ds-bg dark:bg-gray-700 border-b border-ds-border dark:border-gray-600"
          style={{ gridTemplateColumns: "2fr 2fr 1fr 1.2fr 0.8fr 1fr" }}
        >
          {["Customer", "Address", "Created", "Assigned To", "Status", "Action"].map((h) => (
            <div
              key={h}
              className={`text-[10px] uppercase tracking-[2px] text-ds-gray dark:text-gray-400 font-black select-none ${h === "Action" ? "text-right" : ""}`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {paged.map((est) => (
          <UnsentRow key={est.id} estimate={est} isAdmin={isAdmin} />
        ))}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={estimates.length}
          pageSize={pageSize}
          onPageChange={onPageChange}
          label="estimates"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paged.map((est) => (
          <UnsentMobileCard key={est.id} estimate={est} />
        ))}
        {totalPages > 1 && (
          <div className="flex justify-center pt-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={estimates.length}
              pageSize={pageSize}
              onPageChange={onPageChange}
              label="estimates"
              compact
            />
          </div>
        )}
      </div>
    </>
  );
}

// --- Pagination ---
interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  label: string;
  compact?: boolean;
}

function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, label, compact }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Build page numbers to show
  const pages: (number | "...")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 rounded-md border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-800 text-xs font-bold text-ds-gray dark:text-gray-400 flex items-center justify-center disabled:opacity-30 cursor-pointer hover:border-ds-blue hover:text-ds-blue transition-colors"
        >
          &lsaquo;
        </button>
        <span className="text-xs text-ds-gray dark:text-gray-500 px-2">{page}/{totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 rounded-md border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-800 text-xs font-bold text-ds-gray dark:text-gray-400 flex items-center justify-center disabled:opacity-30 cursor-pointer hover:border-ds-blue hover:text-ds-blue transition-colors"
        >
          &rsaquo;
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-ds-border dark:border-gray-600 bg-ds-bg dark:bg-gray-700">
      <span className="text-xs text-ds-gray dark:text-gray-400">
        Showing {start}&ndash;{end} of {totalItems} {label}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-[30px] h-[30px] rounded-[7px] border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-800 text-xs font-bold text-ds-gray dark:text-gray-400 flex items-center justify-center disabled:opacity-30 cursor-pointer hover:border-ds-blue hover:text-ds-blue transition-colors"
        >
          &lsaquo;
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-ds-gray dark:text-gray-500 flex items-center">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-[30px] h-[30px] rounded-[7px] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
                p === page
                  ? "bg-ds-blue text-white border border-ds-blue"
                  : "border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-800 text-ds-gray dark:text-gray-400 hover:border-ds-blue hover:text-ds-blue"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-[30px] h-[30px] rounded-[7px] border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-800 text-xs font-bold text-ds-gray dark:text-gray-400 flex items-center justify-center disabled:opacity-30 cursor-pointer hover:border-ds-blue hover:text-ds-blue transition-colors"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}

// --- Mobile cards ---
import { useRouter } from "next/navigation";
import StatusBadge from "../StatusBadge";
import { getFollowUpStatus } from "./EstimateTableRow";

function getAvatarColor(name: string): string {
  const colors = [
    "from-[#1565c0] to-[#1e88e5]",
    "from-[#2e7d32] to-[#43a047]",
    "from-[#e65100] to-[#ff6d00]",
    "from-[#6a1b9a] to-[#9c27b0]",
    "from-[#00695c] to-[#00897b]",
    "from-[#c62828] to-[#e53935]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAmount(amount: number | null): string {
  if (!amount) return "\u2014";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

const urgencyMobile: Record<string, string> = {
  overdue: "bg-ds-red-bg text-ds-red",
  today: "bg-ds-orange-bg text-ds-orange",
  soon: "bg-ds-yellow-bg text-[#795500]",
  ok: "bg-ds-green-bg text-ds-green",
};

function PipelineMobileCard({ estimate }: { estimate: EstimateRow }) {
  const router = useRouter();
  const fu = getFollowUpStatus(estimate);
  const avatarColor = getAvatarColor(estimate.customer_name);
  const initials = getInitials(estimate.customer_name);

  return (
    <div
      onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
      className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl p-4 cursor-pointer active:bg-ds-bg dark:active:bg-gray-700"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-ds-text dark:text-gray-100">{estimate.customer_name}</div>
            <div className="text-[10px] text-ds-gray-lt dark:text-gray-500">#{estimate.estimate_number}</div>
          </div>
        </div>
        <StatusBadge status={estimate.status} />
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="font-display font-extrabold text-ds-text dark:text-gray-100">{formatAmount(estimate.total_amount)}</span>
        <span className="text-ds-gray dark:text-gray-500 text-xs">Sent {formatDate(estimate.sent_date)}</span>
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold py-[3px] px-2 rounded-[6px] ${urgencyMobile[fu.type]}`}>
          {fu.label}
        </span>
      </div>
    </div>
  );
}

function UnsentMobileCard({ estimate }: { estimate: EstimateRow }) {
  const router = useRouter();
  const avatarColor = getAvatarColor(estimate.customer_name);
  const initials = getInitials(estimate.customer_name);

  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-ds-text dark:text-gray-100">{estimate.customer_name}</div>
            <div className="text-[10px] text-ds-gray-lt dark:text-gray-500">#{estimate.estimate_number}</div>
          </div>
        </div>
        <StatusBadge status={estimate.status} />
      </div>
      {estimate.customer_address && (
        <p className="text-xs text-ds-text-lt dark:text-gray-400 mb-2">{estimate.customer_address}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-ds-gray dark:text-gray-500">Created {formatDate(estimate.sent_date)}</span>
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
