"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Campaign } from "@/lib/campaign-types";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import StatCard from "@/app/components/ui/StatCard";
import CampaignRecipientTable from "./CampaignRecipientTable";

interface Props {
  campaign: Campaign;
}

export default function CampaignDetail({ campaign: initial }: Props) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign>(initial);
  const [acting, setActing] = useState(false);

  async function handlePauseResume() {
    setActing(true);
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/pause`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setCampaign(updated);
    }
    setActing(false);
  }

  async function handleSend() {
    if (!confirm("Launch this campaign now?")) return;
    setActing(true);
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/send`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setCampaign(updated);
    }
    setActing(false);
  }

  function fmtRate(count: number): string {
    if (campaign.sent_count === 0) return "—";
    return `${((count / campaign.sent_count) * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard label="Audience" value={campaign.audience_count.toLocaleString()} />
        <StatCard label="Sent" value={campaign.sent_count.toLocaleString()} />
        <StatCard label="Opened" value={fmtRate(campaign.opened_count)} />
        <StatCard label="Clicked" value={fmtRate(campaign.clicked_count)} />
        <StatCard label="Bounced" value={campaign.bounced_count.toLocaleString()} />
        <StatCard label="Unsubscribed" value={campaign.unsubscribed_count.toLocaleString()} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {campaign.status === "draft" && (
          <Button size="sm" onClick={handleSend} disabled={acting}>
            Launch Campaign
          </Button>
        )}
        {campaign.status === "sending" && (
          <Button variant="warning" size="sm" onClick={handlePauseResume} disabled={acting}>
            Pause
          </Button>
        )}
        {campaign.status === "paused" && (
          <Button variant="success" size="sm" onClick={handlePauseResume} disabled={acting}>
            Resume
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/dashboard/admin/campaigns")}
        >
          ← Back to Campaigns
        </Button>
      </div>

      {/* Recipients */}
      {campaign.status !== "draft" && (
        <Card title="Recipients">
          <CampaignRecipientTable campaignId={campaign.id} />
        </Card>
      )}

      {/* Details */}
      <Card title="Campaign Details">
        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <span className="text-ds-text-lt">Type:</span>
            <span className="ml-2 text-ds-text font-medium capitalize">{campaign.type}</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Status:</span>
            <span className="ml-2 text-ds-text font-medium capitalize">{campaign.status}</span>
          </div>
          {campaign.subject && (
            <div className="col-span-2">
              <span className="text-ds-text-lt">Subject:</span>
              <span className="ml-2 text-ds-text">{campaign.subject}</span>
            </div>
          )}
          <div>
            <span className="text-ds-text-lt">Batch Size:</span>
            <span className="ml-2 text-ds-text">{campaign.batch_size}</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Batch Interval:</span>
            <span className="ml-2 text-ds-text">{campaign.batch_interval_minutes} min</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Warmup:</span>
            <span className="ml-2 text-ds-text">{campaign.warmup_mode ? "Enabled" : "Off"}</span>
          </div>
          {campaign.scheduled_at && (
            <div>
              <span className="text-ds-text-lt">Scheduled:</span>
              <span className="ml-2 text-ds-text">
                {new Date(campaign.scheduled_at).toLocaleString()}
              </span>
            </div>
          )}
          {campaign.started_at && (
            <div>
              <span className="text-ds-text-lt">Started:</span>
              <span className="ml-2 text-ds-text">
                {new Date(campaign.started_at).toLocaleString()}
              </span>
            </div>
          )}
          {campaign.completed_at && (
            <div>
              <span className="text-ds-text-lt">Completed:</span>
              <span className="ml-2 text-ds-text">
                {new Date(campaign.completed_at).toLocaleString()}
              </span>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-ds-text-lt">Created:</span>
            <span className="ml-2 text-ds-text">
              {new Date(campaign.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
