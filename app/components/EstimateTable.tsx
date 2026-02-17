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
  assigned_to_name: string | null;
  emails_sent: number;
  sms_sent: number;
  calls_made: number;
  opens: number;
  last_contacted: string | null;
  has_pending_action: boolean;
}

interface EstimateTableProps {
  estimates: EstimateRow[];
  role: UserRole;
}

export default function EstimateTable({ estimates, role }: EstimateTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = estimates;

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.customer_name.toLowerCase().includes(query)
      );
    }

    // Sort: needs action first, then by sent_date ascending (oldest first)
    result = [...result].sort((a, b) => {
      if (a.has_pending_action && !b.has_pending_action) return -1;
      if (!a.has_pending_action && b.has_pending_action) return 1;

      // Active before other statuses
      const statusOrder: Record<string, number> = {
        active: 0,
        snoozed: 1,
        sent: 2,
        dormant: 3,
        won: 4,
        lost: 5,
      };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Oldest first within same status
      const aDate = a.sent_date ? new Date(a.sent_date).getTime() : 0;
      const bDate = b.sent_date ? new Date(b.sent_date).getTime() : 0;
      return aDate - bDate;
    });

    return result;
  }, [estimates, statusFilter, searchQuery]);

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
      <div className="mb-4">
        <EstimateFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          No estimates found.
        </div>
      ) : (
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
                {filtered.map((estimate) => (
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
            {filtered.map((estimate) => (
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
      )}
    </div>
  );
}
