"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Campaign, CampaignStatus } from "@/lib/campaign-types";
import Button from "@/app/components/ui/Button";

interface Props {
  initialCampaigns: Campaign[];
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-50 text-ds-blue",
  sending: "bg-green-50 text-ds-green",
  paused: "bg-yellow-50 text-ds-orange",
  sent: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-ds-red",
};

type FilterTab = "all" | "draft" | "active" | "sent";

export default function CampaignList({ initialCampaigns }: Props) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = campaigns.filter((c) => {
    if (tab === "draft") return c.status === "draft";
    if (tab === "active") return ["scheduled", "sending", "paused"].includes(c.status);
    if (tab === "sent") return c.status === "sent";
    return true;
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign?")) return;
    const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/campaigns/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      setCampaigns((prev) => [dup, ...prev]);
    }
  }

  function fmtRate(sent: number, count: number): string {
    if (sent === 0) return "—";
    return `${((count / sent) * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "draft", "active", "sent"] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                tab === t
                  ? "bg-ds-blue text-white"
                  : "bg-gray-100 text-ds-text-lt hover:bg-gray-200"
              }`}
            >
              {t === "all" ? "All" : t === "draft" ? "Drafts" : t === "active" ? "Active" : "Sent"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard/admin/campaigns/new")}>
          + New Campaign
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ds-text-lt text-sm">
          No campaigns yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ds-border text-left">
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Name</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Type</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Status</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider text-right">Audience</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider text-right">Sent</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider text-right">Open Rate</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider text-right">Click Rate</th>
                <th className="pb-2 font-semibold text-ds-text-lt text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-ds-border/50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/admin/campaigns/${c.id}`)}
                >
                  <td className="py-3 font-medium text-ds-text">{c.name}</td>
                  <td className="py-3 capitalize text-ds-text-lt">{c.type}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-ds-text-lt">{(c.audience_count ?? 0).toLocaleString()}</td>
                  <td className="py-3 text-right text-ds-text-lt">{(c.sent_count ?? 0).toLocaleString()}</td>
                  <td className="py-3 text-right text-ds-text-lt">{fmtRate(c.sent_count ?? 0, c.opened_count ?? 0)}</td>
                  <td className="py-3 text-right text-ds-text-lt">{fmtRate(c.sent_count ?? 0, c.clicked_count ?? 0)}</td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicate(c.id)}
                        className="text-xs text-ds-blue hover:underline cursor-pointer"
                      >
                        Duplicate
                      </button>
                      {c.status === "draft" && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs text-ds-red hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
