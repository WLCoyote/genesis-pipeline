"use client";

import { useState, useMemo } from "react";
import { EstimateStatus, UserRole } from "@/lib/types";
import EstimateStats from "./estimates/EstimateStats";
import EstimateToolbar, { type Tab, type TimeFilter } from "./estimates/EstimateToolbar";
import { PipelineTable, UnsentTable } from "./estimates/EstimateTable";
import type { EstimateRow } from "./estimates/EstimateTableRow";

interface EstimateTableProps {
  estimates: EstimateRow[];
  role: UserRole;
}

export default function EstimateTable({ estimates, role }: EstimateTableProps) {
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<Tab>("pipeline");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const [repFilter, setRepFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // --- Derived sets ---
  const pipelineEstimates = useMemo(
    () => estimates.filter((e) => e.status !== "draft" && e.status !== "won" && e.status !== "lost"),
    [estimates]
  );
  const unsentEstimates = useMemo(
    () => estimates.filter((e) => e.status === "draft"),
    [estimates]
  );
  const wonEstimates = useMemo(
    () => estimates.filter((e) => e.status === "won"),
    [estimates]
  );
  const lostEstimates = useMemo(
    () => estimates.filter((e) => e.status === "lost"),
    [estimates]
  );

  // Unique rep names for filter dropdown
  const reps = useMemo(() => {
    const names = new Set<string>();
    estimates.forEach((e) => { if (e.assigned_to_name) names.add(e.assigned_to_name); });
    return Array.from(names).sort();
  }, [estimates]);

  // --- Stats ---
  const stats = useMemo(() => {
    const active = estimates.filter((e) => e.status !== "draft");
    const pipelineValue = pipelineEstimates.reduce((s, e) => s + (e.total_amount || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonthArr = wonEstimates.filter((e) => e.sent_date && new Date(e.sent_date) >= monthStart);
    const wonAmount = wonThisMonthArr.reduce((s, e) => s + (e.total_amount || 0), 0);

    const allWithAmount = active.filter((e) => e.total_amount && e.total_amount > 0);
    const avgQuoteValue = allWithAmount.length > 0
      ? allWithAmount.reduce((s, e) => s + (e.total_amount || 0), 0) / allWithAmount.length
      : 0;

    // Close rate: won / (won + lost) over last 90 days
    const d90 = new Date(Date.now() - 90 * 86400000);
    const won90 = wonEstimates.filter((e) => e.sent_date && new Date(e.sent_date) >= d90).length;
    const lost90 = lostEstimates.filter((e) => e.sent_date && new Date(e.sent_date) >= d90).length;
    const closeRate = won90 + lost90 > 0 ? Math.round((won90 / (won90 + lost90)) * 100) : 0;

    return {
      pipelineValue,
      pipelineCount: pipelineEstimates.length,
      unsentCount: unsentEstimates.length,
      wonThisMonth: wonThisMonthArr.length,
      wonAmount,
      avgQuoteValue: Math.round(avgQuoteValue),
      closeRate,
    };
  }, [estimates, pipelineEstimates, unsentEstimates, wonEstimates, lostEstimates]);

  // --- Filtering ---
  const filtered = useMemo(() => {
    let source: EstimateRow[];
    switch (tab) {
      case "pipeline": source = pipelineEstimates; break;
      case "unsent": source = unsentEstimates; break;
      case "won": source = wonEstimates; break;
      case "lost": source = lostEstimates; break;
    }

    let result = source;

    // Status filter (only on pipeline tab)
    if (tab === "pipeline" && statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    // Rep filter
    if (repFilter !== "all") {
      result = result.filter((e) => e.assigned_to_name === repFilter);
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = Date.now();
      let cutoff: number;
      switch (timeFilter) {
        case "this_week": cutoff = now - 7 * 86400000; break;
        case "this_month": cutoff = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(); break;
        case "last_90": cutoff = now - 90 * 86400000; break;
        default: cutoff = 0;
      }
      result = result.filter((e) => e.sent_date && new Date(e.sent_date).getTime() >= cutoff);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.customer_name.toLowerCase().includes(q));
    }

    // Sort newest first
    result = [...result].sort((a, b) => {
      const ad = a.sent_date ? new Date(a.sent_date).getTime() : 0;
      const bd = b.sent_date ? new Date(b.sent_date).getTime() : 0;
      return bd - ad;
    });

    return result;
  }, [tab, pipelineEstimates, unsentEstimates, wonEstimates, lostEstimates, statusFilter, repFilter, timeFilter, searchQuery]);

  // Reset page when filters change
  const handleTabChange = (t: Tab) => { setTab(t); setStatusFilter("all"); setPage(1); };
  const handleStatusChange = (s: EstimateStatus | "all") => { setStatusFilter(s); setPage(1); };
  const handleRepChange = (r: string) => { setRepFilter(r); setPage(1); };
  const handleTimeChange = (t: TimeFilter) => { setTimeFilter(t); setPage(1); };
  const handleSearch = (q: string) => { setSearchQuery(q); setPage(1); };

  return (
    <div>
      <EstimateStats {...stats} />

      <EstimateToolbar
        tab={tab}
        onTabChange={handleTabChange}
        pipelineCount={pipelineEstimates.length}
        unsentCount={unsentEstimates.length}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        repFilter={repFilter}
        onRepChange={handleRepChange}
        reps={reps}
        timeFilter={timeFilter}
        onTimeChange={handleTimeChange}
        resultCount={filtered.length}
        isAdmin={isAdmin}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ds-gray dark:text-gray-500 text-sm">
          {tab === "unsent"
            ? "No unsent estimates. Click Update Estimates to pull from HCP."
            : `No ${tab} estimates found.`}
        </div>
      ) : tab === "unsent" ? (
        <UnsentTable
          estimates={filtered}
          isAdmin={isAdmin}
          page={page}
          onPageChange={setPage}
        />
      ) : (
        <PipelineTable
          estimates={filtered}
          isAdmin={isAdmin}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
