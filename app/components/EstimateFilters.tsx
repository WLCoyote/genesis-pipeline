"use client";

import { EstimateStatus } from "@/lib/types";

interface EstimateFiltersProps {
  statusFilter: EstimateStatus | "all";
  searchQuery: string;
  onStatusChange: (status: EstimateStatus | "all") => void;
  onSearchChange: (query: string) => void;
}

const statusOptions: { value: EstimateStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "snoozed", label: "Snoozed" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "dormant", label: "Dormant" },
  { value: "sent", label: "Sent" },
];

export default function EstimateFilters({
  statusFilter,
  searchQuery,
  onStatusChange,
  onSearchChange,
}: EstimateFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as EstimateStatus | "all")}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search customer name..."
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
