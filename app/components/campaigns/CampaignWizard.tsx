"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CampaignType, SegmentFilter, EmailTemplate } from "@/lib/campaign-types";
import CampaignWizardSteps, { WizardStep } from "./CampaignWizardSteps";
import CampaignSetupStep from "./CampaignSetupStep";
import CampaignContentStep from "./CampaignContentStep";
import CampaignAudienceStep from "./CampaignAudienceStep";
import CampaignScheduleStep from "./CampaignScheduleStep";
import CampaignReviewStep from "./CampaignReviewStep";
import Button from "@/app/components/ui/Button";

interface Props {
  templates: EmailTemplate[];
}

export default function CampaignWizard({ templates }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Step 1: Setup
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("email");

  // Step 2: Content
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState<string | null>(null);
  const [smsBody, setSmsBody] = useState("");

  // Step 3: Audience
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>({ logic: "and", rules: [] });
  const [excludeActivePipeline, setExcludeActivePipeline] = useState(true);
  const [excludeRecentContactDays, setExcludeRecentContactDays] = useState<number | null>(30);

  // Step 4: Schedule
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [batchSize, setBatchSize] = useState(50);
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(60);
  const [warmupMode, setWarmupMode] = useState(false);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        type,
        subject,
        preview_text: previewText || null,
        email_template_id: emailTemplateId,
        sms_body: smsBody || null,
        segment_filter: segmentFilter,
        exclude_active_pipeline: excludeActivePipeline,
        exclude_recent_contact_days: excludeRecentContactDays,
        batch_size: batchSize,
        batch_interval_minutes: batchIntervalMinutes,
        warmup_mode: warmupMode,
        scheduled_at: !sendNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      let res: Response;
      if (campaignId) {
        res = await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      const saved = await res.json();
      if (!campaignId) setCampaignId(saved.id);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  }, [name, type, subject, previewText, emailTemplateId, smsBody, segmentFilter, excludeActivePipeline, excludeRecentContactDays, batchSize, batchIntervalMinutes, warmupMode, sendNow, scheduledAt, campaignId]);

  async function handleNext() {
    if (step === 1 && !name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (step === 2 && type === "email" && !emailTemplateId) {
      setError("Please select an email template");
      return;
    }
    if (step === 2 && type === "email" && !subject.trim()) {
      setError("Subject line is required");
      return;
    }
    if (step === 2 && type === "sms" && !smsBody.trim()) {
      setError("SMS message is required");
      return;
    }

    setError(null);

    // Save draft when leaving step 2 (all required fields present)
    if (step >= 2) {
      const saved = await saveDraft();
      if (!saved) return;
    }

    if (step < 5) setStep((step + 1) as WizardStep);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as WizardStep);
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      // Save final state
      const saved = await saveDraft();
      if (!saved) { setSending(false); return; }

      const cid = campaignId || saved.id;

      if (sendNow) {
        // Send immediately
        const res = await fetch(`/api/admin/campaigns/${cid}/send`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Send failed");
        }
      } else {
        // Schedule
        await fetch(`/api/admin/campaigns/${cid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "scheduled" }),
        });
      }

      router.push("/dashboard/admin/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <CampaignWizardSteps activeStep={step} onStepClick={setStep} />

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="text-sm text-ds-red bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</div>
        )}

        {step === 1 && (
          <CampaignSetupStep
            name={name}
            onNameChange={setName}
            type={type}
            onTypeChange={setType}
          />
        )}

        {step === 2 && (
          <CampaignContentStep
            campaignType={type}
            subject={subject}
            onSubjectChange={setSubject}
            previewText={previewText}
            onPreviewTextChange={setPreviewText}
            emailTemplateId={emailTemplateId}
            onEmailTemplateIdChange={setEmailTemplateId}
            templates={templates}
            smsBody={smsBody}
            onSmsBodyChange={setSmsBody}
          />
        )}

        {step === 3 && (
          <CampaignAudienceStep
            filter={segmentFilter}
            onChange={setSegmentFilter}
            campaignType={type}
            excludeActivePipeline={excludeActivePipeline}
            onExcludeActivePipelineChange={setExcludeActivePipeline}
            excludeRecentContactDays={excludeRecentContactDays}
            onExcludeRecentContactDaysChange={setExcludeRecentContactDays}
          />
        )}

        {step === 4 && (
          <CampaignScheduleStep
            sendNow={sendNow}
            onSendNowChange={setSendNow}
            scheduledAt={scheduledAt}
            onScheduledAtChange={setScheduledAt}
            batchSize={batchSize}
            onBatchSizeChange={setBatchSize}
            batchIntervalMinutes={batchIntervalMinutes}
            onBatchIntervalChange={setBatchIntervalMinutes}
            warmupMode={warmupMode}
            onWarmupModeChange={setWarmupMode}
          />
        )}

        {step === 5 && (
          <CampaignReviewStep
            campaignId={campaignId}
            name={name}
            campaignType={type}
            subject={subject}
            previewText={previewText}
            emailTemplateId={emailTemplateId}
            templates={templates}
            smsBody={smsBody}
            segmentFilter={segmentFilter}
            excludeActivePipeline={excludeActivePipeline}
            excludeRecentContactDays={excludeRecentContactDays}
            batchSize={batchSize}
            batchIntervalMinutes={batchIntervalMinutes}
            warmupMode={warmupMode}
            sendNow={sendNow}
            scheduledAt={scheduledAt}
            onSend={handleSend}
            sending={sending}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-ds-border bg-ds-card px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          {step > 1 && (
            <Button variant="secondary" size="sm" onClick={handleBack}>
              ← Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-ds-text-lt">Saving...</span>}
          {step < 5 && (
            <Button size="sm" onClick={handleNext}>
              Next →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
