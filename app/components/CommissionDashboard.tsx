"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "@/app/components/ui/StatCard";
import Button from "@/app/components/ui/Button";

interface CommissionRecordRow {
  id: string;
  estimate_id: string;
  user_id: string;
  tier_rate_pct: number;
  estimated_amount: number;
  confirmed_amount: number | null;
  manager_commission_amount: number | null;
  status: "estimated" | "confirmed" | "paid";
  created_at: string;
  confirmed_at: string | null;
  estimates: {
    estimate_number: string;
    customers: { name: string } | null;
  } | null;
  users: { name: string } | null;
}

interface Props {
  userId: string;
  isAdmin: boolean;
  teamMembers: { id: string; name: string }[];
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  estimated: "bg-ds-orange-bg text-ds-orange",
  confirmed: "bg-ds-green-bg text-ds-green",
  paid: "bg-ds-blue-bg text-ds-blue",
};

export default function CommissionDashboard({ userId, isAdmin, teamMembers }: Props) {
  const [records, setRecords] = useState<CommissionRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedUser) params.set("user_id", selectedUser);

    const res = await fetch(`/api/admin/commission-records?${params}`);
    const data = await res.json();
    setRecords(data.records || []);
    setLoading(false);
  }, [selectedUser]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Calculate stats
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const ytdConfirmed = records
    .filter((r) => r.status === "confirmed" && r.created_at >= yearStart)
    .reduce((sum, r) => sum + (r.confirmed_amount || 0), 0);

  const mtdEstimated = records
    .filter((r) => r.created_at >= monthStart)
    .reduce((sum, r) => sum + r.estimated_amount, 0);

  const pendingCount = records.filter((r) => r.status === "estimated").length;

  // Get current tier rate from the most recent record
  const latestRecord = records[0];
  const currentTierRate = latestRecord?.tier_rate_pct || 0;

  function downloadCsv() {
    const headers = ["Date", "Customer", "Estimate #", "Rep", "Status", "Rate %", "Estimated", "Confirmed"];
    const rows = records.map((r) => [
      fmtDate(r.created_at),
      r.estimates?.customers?.name || "",
      r.estimates?.estimate_number || "",
      r.users?.name || "",
      r.status,
      r.tier_rate_pct,
      r.estimated_amount.toFixed(2),
      r.confirmed_amount?.toFixed(2) || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-${now.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="YTD Confirmed" value={fmtMoney(ytdConfirmed)} color="green" />
        <StatCard label="MTD Estimated" value={fmtMoney(mtdEstimated)} color="orange" />
        <StatCard label="Current Rate" value={`${currentTierRate}%`} color="blue" />
        <StatCard label="Pending" value={String(pendingCount)} subtext="awaiting confirmation" color="default" />
      </div>

      {/* Tier progress bar */}
      {currentTierRate > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Tier Progress (Monthly Revenue)
          </p>
          <TierProgressBar mtdRevenue={mtdEstimated} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isAdmin && teamMembers.length > 0 && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Reps</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={downloadCsv}>
          Export CSV
        </Button>
      </div>

      {/* Records table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Estimate</th>
              {isAdmin && (
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Rep</th>
              )}
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Rate</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Estimated</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Confirmed</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No commission records yet. Records are created when proposals are signed.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/25"
                >
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {fmtDate(record.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium">
                    {record.estimates?.customers?.name || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">
                    {record.estimates?.estimate_number || "—"}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      {record.users?.name || "—"}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {record.tier_rate_pct}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900 dark:text-gray-100">
                    {fmtMoney(record.estimated_amount)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                    {record.confirmed_amount != null ? fmtMoney(record.confirmed_amount) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${STATUS_STYLES[record.status] || ""}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Tier Progress Bar ---
function TierProgressBar({ mtdRevenue }: { mtdRevenue: number }) {
  // Hardcoded tier thresholds for visual reference (matches seed data)
  const thresholds = [
    { label: "5%", min: 0, max: 25000 },
    { label: "6%", min: 25000, max: 50000 },
    { label: "7%", min: 50000, max: 100000 },
    { label: "8%", min: 100000, max: 150000 },
  ];

  const totalMax = thresholds[thresholds.length - 1].max;
  const progressPct = Math.min((mtdRevenue / totalMax) * 100, 100);

  return (
    <div>
      <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-ds-blue to-ds-green rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
        {/* Threshold markers */}
        {thresholds.slice(1).map((t) => (
          <div
            key={t.min}
            className="absolute inset-y-0 w-px bg-gray-300 dark:bg-gray-500"
            style={{ left: `${(t.min / totalMax) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {thresholds.map((t) => (
          <span key={t.label} className="text-[10px] text-gray-400">
            {t.label} — ${(t.min / 1000).toFixed(0)}k
          </span>
        ))}
      </div>
    </div>
  );
}
