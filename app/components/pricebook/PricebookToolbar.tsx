"use client";

export type SourceFilter = "all" | "hcp_service" | "hcp_material" | "manual";
export type MarginFilter = "all" | "negative" | "under20" | "20to40" | "over40";

interface PricebookToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (f: SourceFilter) => void;
  marginFilter: MarginFilter;
  onMarginFilterChange: (f: MarginFilter) => void;
  showInactive: boolean;
  onShowInactiveChange: (v: boolean) => void;
}

export default function PricebookToolbar({
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  marginFilter,
  onMarginFilterChange,
  showInactive,
  onShowInactiveChange,
}: PricebookToolbarProps) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-4 py-3 shadow-ds mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-gray-lt dark:text-gray-500"
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
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100 placeholder-ds-gray-lt dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ds-blue/30 focus:border-ds-blue"
          />
        </div>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value as SourceFilter)}
          className="px-3 py-2 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ds-blue/30"
        >
          <option value="all">All Sources</option>
          <option value="hcp_material">HCP Material</option>
          <option value="hcp_service">HCP Service</option>
          <option value="manual">Manual / Pipeline</option>
        </select>

        {/* Margin filter */}
        <select
          value={marginFilter}
          onChange={(e) => onMarginFilterChange(e.target.value as MarginFilter)}
          className="px-3 py-2 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-ds-blue/30"
        >
          <option value="all">All Margins</option>
          <option value="negative">Negative (&lt;0%)</option>
          <option value="under20">Under 20%</option>
          <option value="20to40">20% – 40%</option>
          <option value="over40">Over 40%</option>
        </select>

        {/* Show inactive toggle */}
        <label className="flex items-center gap-1.5 text-sm text-ds-gray dark:text-gray-400 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => onShowInactiveChange(e.target.checked)}
            className="rounded border-ds-border dark:border-gray-600"
          />
          Show inactive
        </label>
      </div>
    </div>
  );
}
