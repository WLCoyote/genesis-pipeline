"use client";

import { useEffect, useState, useCallback } from "react";
import Button from "@/app/components/ui/Button";
import { CampaignRecipientStatus } from "@/lib/campaign-types";

interface Recipient {
  id: string;
  status: CampaignRecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  unsubscribed_at: string | null;
  batch_number: number | null;
  customers: { name: string; email: string; phone: string | null } | null;
}

interface Props {
  campaignId: string;
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-ds-blue",
  opened: "bg-green-50 text-ds-green",
  clicked: "bg-emerald-50 text-emerald-700",
  bounced: "bg-red-50 text-ds-red",
  unsubscribed: "bg-yellow-50 text-ds-orange",
  skipped: "bg-gray-50 text-ds-gray",
};

export default function CampaignRecipientTable({ campaignId }: Props) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/campaigns/${campaignId}/recipients?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecipients(data.recipients);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [campaignId, page, statusFilter]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  function handleExport() {
    window.open(`/api/admin/campaigns/${campaignId}/export`, "_blank");
  }

  function fmtDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  }

  const statuses: string[] = ["", "queued", "sent", "opened", "clicked", "bounced", "unsubscribed", "skipped"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ds-text-lt">{total.toLocaleString()} recipients</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-ds-border rounded-lg px-2 py-1 bg-ds-card text-ds-text"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="xs" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-ds-text-lt text-sm">Loading...</div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-8 text-ds-text-lt text-sm">No recipients found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ds-border text-left">
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Name</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Email</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Status</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider text-right">Batch</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Sent</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Opened</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-ds-border/50">
                  <td className="py-2.5 font-medium text-ds-text">{r.customers?.name || "—"}</td>
                  <td className="py-2.5 text-ds-text-lt">{r.customers?.email || "—"}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_COLORS[r.status] || ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-ds-text-lt">{r.batch_number || "—"}</td>
                  <td className="py-2.5 text-ds-text-lt text-xs">{fmtDate(r.sent_at)}</td>
                  <td className="py-2.5 text-ds-text-lt text-xs">{fmtDate(r.opened_at)}</td>
                  <td className="py-2.5 text-ds-text-lt text-xs">{fmtDate(r.clicked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-ds-text-lt">
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
