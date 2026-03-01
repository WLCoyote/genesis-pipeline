"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EstimateStatus, UserRole } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import CounterBadge from "./CounterBadge";
import EstimateFilters from "./EstimateFilters";

interface EstimateRow {
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

type Tab = "pipeline" | "unsent";

interface EstimateTableProps {
  estimates: EstimateRow[];
  role: UserRole;
}

export default function EstimateTable({ estimates, role }: EstimateTableProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const pipelineEstimates = useMemo(
    () => estimates.filter((e) => e.status !== "draft"),
    [estimates]
  );

  const unsentEstimates = useMemo(
    () => estimates.filter((e) => e.status === "draft"),
    [estimates]
  );

  const filtered = useMemo(() => {
    const source = tab === "pipeline" ? pipelineEstimates : unsentEstimates;
    let result = source;

    if (tab === "pipeline" && statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.customer_name.toLowerCase().includes(query)
      );
    }

    // Sort: newest to oldest by sent_date
    result = [...result].sort((a, b) => {
      const aDate = a.sent_date ? new Date(a.sent_date).getTime() : 0;
      const bDate = b.sent_date ? new Date(b.sent_date).getTime() : 0;
      return bDate - aDate;
    });

    return result;
  }, [tab, pipelineEstimates, unsentEstimates, statusFilter, searchQuery]);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "—";
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 w-fit">
        <button
          onClick={() => { setTab("pipeline"); setStatusFilter("all"); }}
          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            tab === "pipeline"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Pipeline
          {pipelineEstimates.length > 0 && (
            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
              {pipelineEstimates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab("unsent"); setStatusFilter("all"); }}
          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            tab === "unsent"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Unsent
          {unsentEstimates.length > 0 && (
            <span className="ml-1.5 text-xs font-semibold text-orange-500">
              {unsentEstimates.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters (pipeline tab only shows status filter) */}
      <div className="mb-4">
        {tab === "pipeline" ? (
          <EstimateFilters
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onStatusChange={setStatusFilter}
            onSearchChange={setSearchQuery}
          />
        ) : (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          {tab === "unsent"
            ? "No unsent estimates. Click Update Estimates to pull from HCP."
            : "No estimates found."}
        </div>
      ) : tab === "pipeline" ? (
        <PipelineView
          estimates={filtered}
          role={role}
          router={router}
          formatDate={formatDate}
          formatAmount={formatAmount}
        />
      ) : (
        <UnsentView
          estimates={filtered}
          role={role}
          router={router}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

// --- Pipeline view (existing table) ---

function PipelineView({
  estimates,
  role,
  router,
  formatDate,
  formatAmount,
}: {
  estimates: EstimateRow[];
  role: UserRole;
  router: ReturnType<typeof useRouter>;
  formatDate: (d: string | null) => string;
  formatAmount: (a: number | null) => string;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Customer
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Amount
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Sent
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Last Contact
              </th>
              {role === "admin" && (
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Assigned To
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr
                key={estimate.id}
                onClick={() =>
                  router.push(`/dashboard/estimates/${estimate.id}`)
                }
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {estimate.customer_name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    #{estimate.estimate_number}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {formatAmount(estimate.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={estimate.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(estimate.sent_date)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(estimate.last_contacted)}
                </td>
                {role === "admin" && (
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {estimate.assigned_to_name || "Unassigned"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CounterBadge
                      icon="✉"
                      count={estimate.emails_sent}
                      title="Emails sent"
                    />
                    <CounterBadge
                      icon="💬"
                      count={estimate.sms_sent}
                      title="Texts sent"
                    />
                    <CounterBadge
                      icon="📞"
                      count={estimate.calls_made}
                      title="Calls made"
                    />
                    <CounterBadge
                      icon="👁"
                      count={estimate.opens}
                      title="Email opens"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {estimates.map((estimate) => (
          <div
            key={estimate.id}
            onClick={() =>
              router.push(`/dashboard/estimates/${estimate.id}`)
            }
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer active:bg-blue-50 dark:active:bg-blue-900/20"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {estimate.customer_name}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  #{estimate.estimate_number}
                </div>
              </div>
              <StatusBadge status={estimate.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {formatAmount(estimate.total_amount)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Sent {formatDate(estimate.sent_date)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <CounterBadge
                icon="✉"
                count={estimate.emails_sent}
                title="Emails sent"
              />
              <CounterBadge
                icon="💬"
                count={estimate.sms_sent}
                title="Texts sent"
              />
              <CounterBadge
                icon="📞"
                count={estimate.calls_made}
                title="Calls made"
              />
              <CounterBadge
                icon="👁"
                count={estimate.opens}
                title="Email opens"
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// --- Unsent view (draft estimates from HCP) ---

function UnsentView({
  estimates,
  role,
  router,
  formatDate,
}: {
  estimates: EstimateRow[];
  role: UserRole;
  router: ReturnType<typeof useRouter>;
  formatDate: (d: string | null) => string;
}) {
  const handleBuildQuote = (e: React.MouseEvent, estimate: EstimateRow) => {
    e.stopPropagation();
    router.push(`/dashboard/quote-builder?estimate_id=${estimate.id}`);
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Customer
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Address
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Created
              </th>
              {role === "admin" && (
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Assigned To
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr
                key={estimate.id}
                onClick={() =>
                  router.push(`/dashboard/estimates/${estimate.id}`)
                }
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {estimate.customer_name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    #{estimate.estimate_number}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                  {estimate.customer_address || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(estimate.sent_date)}
                </td>
                {role === "admin" && (
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {estimate.assigned_to_name || "Unassigned"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={estimate.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => handleBuildQuote(e, estimate)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    Build Quote
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {estimates.map((estimate) => (
          <div
            key={estimate.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {estimate.customer_name}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  #{estimate.estimate_number}
                </div>
              </div>
              <StatusBadge status={estimate.status} />
            </div>
            {estimate.customer_address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {estimate.customer_address}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Created {formatDate(estimate.sent_date)}
              </span>
              <button
                onClick={(e) => handleBuildQuote(e, estimate)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Build Quote
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
