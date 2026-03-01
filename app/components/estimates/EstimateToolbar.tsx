"use client";

import { EstimateStatus } from "@/lib/types";

export type Tab = "pipeline" | "unsent" | "won" | "lost";
export type TimeFilter = "all" | "this_week" | "this_month" | "last_90";

interface EstimateToolbarProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  pipelineCount: number;
  unsentCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: EstimateStatus | "all";
  onStatusChange: (s: EstimateStatus | "all") => void;
  repFilter: string;
  onRepChange: (r: string) => void;
  reps: string[];
  timeFilter: TimeFilter;
  onTimeChange: (t: TimeFilter) => void;
  resultCount: number;
  isAdmin: boolean;
}

const statusOptions: { value: EstimateStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "snoozed", label: "Snoozed" },
  { value: "dormant", label: "Dormant" },
  { value: "sent", label: "Sent" },
];

const timeOptions: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_90", label: "Last 90 Days" },
];

const tabs: { key: Tab; label: string }[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "unsent", label: "Unsent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default function EstimateToolbar({
  tab,
  onTabChange,
  pipelineCount,
  unsentCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  repFilter,
  onRepChange,
  reps,
  timeFilter,
  onTimeChange,
  resultCount,
  isAdmin,
}: EstimateToolbarProps) {
  const getCount = (key: Tab) => {
    if (key === "pipeline") return pipelineCount;
    if (key === "unsent") return unsentCount;
    return null;
  };

  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-3.5 py-2.5 shadow-ds mb-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Pill tabs */}
        {tabs.map((t) => {
          const count = getCount(t.key);
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`px-4 py-1.5 rounded-[7px] text-[13px] font-bold transition-all cursor-pointer border-none font-body ${
                isActive
                  ? "bg-ds-blue text-white shadow-[0_3px_10px_rgba(21,101,192,0.3)]"
                  : "text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200 bg-transparent"
              }`}
            >
              {t.label}
              {count !== null && count > 0 && (
                <span
                  className={`text-[10px] font-black py-px px-[7px] rounded-[10px] ml-1 ${
                    isActive
                      ? "bg-white/25"
                      : t.key === "unsent"
                        ? "bg-ds-orange-bg text-ds-orange"
                        : "bg-ds-bg dark:bg-gray-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Separator */}
        <div className="w-px h-6 bg-ds-border dark:bg-gray-600 mx-1" />

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ds-gray-lt dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search customer name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-[7px] text-[13px] rounded-lg border-[1.5px] border-ds-border dark:border-gray-600 bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 placeholder:text-ds-gray-lt dark:placeholder:text-gray-500 focus:outline-none focus:border-ds-blue focus:bg-white dark:focus:bg-gray-600 transition-colors"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as EstimateStatus | "all")}
          className="px-3 py-[7px] text-[13px] rounded-lg border-[1.5px] border-ds-border dark:border-gray-600 bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:outline-none focus:border-ds-blue cursor-pointer"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Rep filter (admin only) */}
        {isAdmin && (
          <select
            value={repFilter}
            onChange={(e) => onRepChange(e.target.value)}
            className="px-3 py-[7px] text-[13px] rounded-lg border-[1.5px] border-ds-border dark:border-gray-600 bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:outline-none focus:border-ds-blue cursor-pointer"
          >
            <option value="all">All Reps</option>
            {reps.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}

        {/* Time filter */}
        <select
          value={timeFilter}
          onChange={(e) => onTimeChange(e.target.value as TimeFilter)}
          className="px-3 py-[7px] text-[13px] rounded-lg border-[1.5px] border-ds-border dark:border-gray-600 bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:outline-none focus:border-ds-blue cursor-pointer"
        >
          {timeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Spacer + result count */}
        <div className="flex-1" />
        <span className="text-xs text-ds-gray dark:text-gray-500">{resultCount} results</span>
      </div>
    </div>
  );
}
