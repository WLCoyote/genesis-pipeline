"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import StatusBadge from "@/app/components/StatusBadge";
import { EstimateStatus } from "@/lib/types";

interface PipelineEstimate {
  id: string;
  estimate_number: string;
  status: EstimateStatus;
  total_amount: number | null;
  sent_date: string | null;
  customer_name: string;
  last_contacted: string | null;
}

// Avatar helpers (duplicated from EstimateTableRow — small utilities, not worth extracting)
const AVATAR_COLORS = [
  "from-[#1565c0] to-[#1e88e5]",
  "from-[#2e7d32] to-[#43a047]",
  "from-[#e65100] to-[#ff6d00]",
  "from-[#6a1b9a] to-[#9c27b0]",
  "from-[#00695c] to-[#00897b]",
  "from-[#c62828] to-[#e53935]",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function getUrgency(est: PipelineEstimate): { label: string; type: string } {
  if (est.status === "won") return { label: "Closed", type: "ok" };
  if (est.status === "lost") return { label: "Lost", type: "ok" };
  const lastContact = est.last_contacted || est.sent_date;
  if (!lastContact) return { label: "No contact", type: "overdue" };
  const daysSince = Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000);
  if (daysSince > 3) return { label: `${daysSince}d overdue`, type: "overdue" };
  if (daysSince === 3) return { label: "Today", type: "today" };
  if (daysSince >= 1) return { label: daysSince === 2 ? "Tomorrow" : "In 2 days", type: "soon" };
  return { label: "Recent", type: "ok" };
}

const urgencyColors: Record<string, string> = {
  overdue: "bg-red-100 text-red-700",
  today: "bg-orange-100 text-orange-700",
  soon: "bg-yellow-100 text-yellow-800",
  ok: "bg-green-100 text-green-700",
};

type Tab = "pipeline" | "won" | "lost";

export default function MobilePipelineList({ estimates }: { estimates: PipelineEstimate[] }) {
  const [tab, setTab] = useState<Tab>("pipeline");
  const [search, setSearch] = useState("");
  const [showCount, setShowCount] = useState(20);

  const filtered = useMemo(() => {
    let list = estimates;

    // Tab filter
    if (tab === "pipeline") {
      list = list.filter((e) => e.status !== "won" && e.status !== "lost" && e.status !== "draft");
    } else if (tab === "won") {
      list = list.filter((e) => e.status === "won");
    } else {
      list = list.filter((e) => e.status === "lost");
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.customer_name.toLowerCase().includes(q) ||
          e.estimate_number.toLowerCase().includes(q)
      );
    }

    return list;
  }, [estimates, tab, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  const tabCounts = useMemo(() => ({
    pipeline: estimates.filter((e) => e.status !== "won" && e.status !== "lost" && e.status !== "draft").length,
    won: estimates.filter((e) => e.status === "won").length,
    lost: estimates.filter((e) => e.status === "lost").length,
  }), [estimates]);

  return (
    <div className="px-4 py-3">
      {/* Pill tabs */}
      <div className="flex gap-2 mb-3">
        {(["pipeline", "won", "lost"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowCount(20); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === t
                ? "bg-ds-blue text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} ({tabCounts[t]})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search customers or estimate #..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 mb-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-ds-blue/30"
      />

      {/* Card list */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No estimates found.
          </div>
        ) : (
          visible.map((est) => {
            const urgency = getUrgency(est);
            return (
              <Link
                key={est.id}
                href={`/m/estimates/${est.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 no-underline active:bg-gray-50 dark:active:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(est.customer_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {getInitials(est.customer_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {est.customer_name}
                      </span>
                      {est.total_amount != null && (
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                          ${est.total_amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{est.estimate_number}</span>
                      <StatusBadge status={est.status} />
                      {tab === "pipeline" && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urgencyColors[urgency.type] || urgencyColors.ok}`}>
                          {urgency.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setShowCount((c) => c + 20)}
          className="w-full mt-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Load more ({filtered.length - showCount} remaining)
        </button>
      )}
    </div>
  );
}
