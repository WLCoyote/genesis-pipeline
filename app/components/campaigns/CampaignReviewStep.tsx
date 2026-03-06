"use client";

import { useState } from "react";
import { CampaignType, EmailTemplate, SegmentFilter } from "@/lib/campaign-types";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import { inputCls } from "@/app/components/ui/FormField";

interface Props {
  campaignId: string | null;
  name: string;
  campaignType: CampaignType;
  subject: string;
  previewText: string;
  emailTemplateId: string | null;
  templates: EmailTemplate[];
  smsBody: string;
  segmentFilter: SegmentFilter;
  excludeActivePipeline: boolean;
  excludeRecentContactDays: number | null;
  batchSize: number;
  batchIntervalMinutes: number;
  warmupMode: boolean;
  sendNow: boolean;
  scheduledAt: string;
  onSend: () => void;
  sending: boolean;
}

export default function CampaignReviewStep({
  campaignId,
  name,
  campaignType,
  subject,
  previewText,
  emailTemplateId,
  templates,
  smsBody,
  segmentFilter,
  excludeActivePipeline,
  excludeRecentContactDays,
  batchSize,
  batchIntervalMinutes,
  warmupMode,
  sendNow,
  scheduledAt,
  onSend,
  sending,
}: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const templateName = templates.find((t) => t.id === emailTemplateId)?.name || "None";
  const ruleCount = segmentFilter.rules?.length || 0;

  async function handleTestSend() {
    if (!campaignId) return;
    setTestSent(false);
    setTestError(null);

    try {
      const payload: Record<string, string> = {};
      if (campaignType === "email" && testEmail) payload.email = testEmail;
      if (campaignType === "sms") {
        if (!testPhone.trim()) {
          setTestError("Phone number is required for SMS test");
          return;
        }
        payload.phone = testPhone;
      }

      const res = await fetch(`/api/admin/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Test send failed");
      }
      setTestSent(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Campaign Summary">
        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <span className="text-ds-text-lt">Name:</span>
            <span className="ml-2 text-ds-text font-medium">{name}</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Type:</span>
            <span className="ml-2 text-ds-text font-medium capitalize">{campaignType}</span>
          </div>

          {campaignType === "email" && (
            <>
              <div>
                <span className="text-ds-text-lt">Subject:</span>
                <span className="ml-2 text-ds-text font-medium">{subject || "—"}</span>
              </div>
              <div>
                <span className="text-ds-text-lt">Template:</span>
                <span className="ml-2 text-ds-text font-medium">{templateName}</span>
              </div>
              {previewText && (
                <div className="col-span-2">
                  <span className="text-ds-text-lt">Preview Text:</span>
                  <span className="ml-2 text-ds-text">{previewText}</span>
                </div>
              )}
            </>
          )}

          {campaignType === "sms" && (
            <div className="col-span-2">
              <span className="text-ds-text-lt">Message:</span>
              <span className="ml-2 text-ds-text">{smsBody.slice(0, 100)}{smsBody.length > 100 ? "..." : ""}</span>
            </div>
          )}

          <div>
            <span className="text-ds-text-lt">Audience Rules:</span>
            <span className="ml-2 text-ds-text font-medium">{ruleCount} filter{ruleCount !== 1 ? "s" : ""}</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Exclusions:</span>
            <span className="ml-2 text-ds-text">
              {excludeActivePipeline ? "Active pipeline" : ""}
              {excludeActivePipeline && excludeRecentContactDays ? " + " : ""}
              {excludeRecentContactDays ? `${excludeRecentContactDays}d contact` : ""}
              {!excludeActivePipeline && !excludeRecentContactDays ? "None" : ""}
            </span>
          </div>

          <div>
            <span className="text-ds-text-lt">Batch:</span>
            <span className="ml-2 text-ds-text">{batchSize} every {batchIntervalMinutes}min</span>
          </div>
          <div>
            <span className="text-ds-text-lt">Warmup:</span>
            <span className="ml-2 text-ds-text">{warmupMode ? "Enabled" : "Off"}</span>
          </div>

          <div className="col-span-2">
            <span className="text-ds-text-lt">Timing:</span>
            <span className="ml-2 text-ds-text font-medium">
              {sendNow ? "Send immediately" : `Scheduled: ${scheduledAt || "Not set"}`}
            </span>
          </div>
        </div>
      </Card>

      {/* Test send */}
      {campaignId && (
        <Card title="Test Send">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              {campaignType === "email" ? (
                <input
                  className={inputCls}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email address (blank = your email)"
                />
              ) : (
                <input
                  className={inputCls}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Phone number (e.g. +12065551234)"
                />
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={handleTestSend}>
              Send Test
            </Button>
          </div>
          {campaignType === "sms" && (
            <p className="text-xs text-ds-orange mt-2">
              SMS requires A2P 10DLC approval. Test may fail until approved.
            </p>
          )}
          {testSent && (
            <p className="text-xs text-ds-green mt-2">
              Test {campaignType === "email" ? "email" : "SMS"} sent!
            </p>
          )}
          {testError && (
            <p className="text-xs text-ds-red mt-2">{testError}</p>
          )}
        </Card>
      )}

      {/* Launch */}
      <div className="flex justify-end gap-3">
        <Button
          size="lg"
          shadow
          onClick={onSend}
          disabled={sending}
        >
          {sending
            ? "Launching..."
            : sendNow
              ? "Launch Campaign"
              : "Schedule Campaign"}
        </Button>
      </div>
    </div>
  );
}
