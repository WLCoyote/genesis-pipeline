"use client";

import { useState, ReactNode } from "react";

interface LeadsTabsProps {
  leadCount: number;
  estimateCount: number;
  leadsContent: ReactNode;
  estimatesContent: ReactNode;
}

export default function LeadsTabs({
  leadCount,
  estimateCount,
  leadsContent,
  estimatesContent,
}: LeadsTabsProps) {
  const [tab, setTab] = useState<"leads" | "estimates">("leads");

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab("leads")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "leads"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Leads
          {leadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {leadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("estimates")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "estimates"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Estimates
          {estimateCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {estimateCount}
            </span>
          )}
        </button>
      </div>

      {tab === "leads" ? leadsContent : estimatesContent}
    </div>
  );
}
