"use client";

import { EmailTemplate, CampaignType } from "@/lib/campaign-types";
import FormField, { inputCls, textareaCls } from "@/app/components/ui/FormField";
import TemplateVariableBar from "./TemplateVariableBar";
import Card from "@/app/components/ui/Card";

interface Props {
  campaignType: CampaignType;
  // Email fields
  subject: string;
  onSubjectChange: (v: string) => void;
  previewText: string;
  onPreviewTextChange: (v: string) => void;
  emailTemplateId: string | null;
  onEmailTemplateIdChange: (v: string | null) => void;
  templates: EmailTemplate[];
  // SMS fields
  smsBody: string;
  onSmsBodyChange: (v: string) => void;
}

export default function CampaignContentStep({
  campaignType,
  subject,
  onSubjectChange,
  previewText,
  onPreviewTextChange,
  emailTemplateId,
  onEmailTemplateIdChange,
  templates,
  smsBody,
  onSmsBodyChange,
}: Props) {
  if (campaignType === "sms") {
    return (
      <Card title="SMS Content">
        <div className="space-y-4">
          <TemplateVariableBar onInsert={(t) => onSmsBodyChange(smsBody + t)} />
          <FormField label="Message" required>
            <textarea
              className={textareaCls}
              rows={4}
              value={smsBody}
              onChange={(e) => onSmsBodyChange(e.target.value)}
              maxLength={1600}
              placeholder="Hi {{customer_name}}, ..."
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-ds-text-lt">
                {smsBody.length}/1600 chars · {Math.ceil(smsBody.length / 160) || 1} segment{Math.ceil(smsBody.length / 160) !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-ds-text-lt">
                &quot;Reply STOP to unsubscribe&quot; will be auto-appended
              </p>
            </div>
          </FormField>
        </div>
      </Card>
    );
  }

  const activeTemplates = templates.filter((t) => t.is_active);

  return (
    <Card title="Email Content">
      <div className="space-y-4">
        <FormField label="Email Template" required>
          <select
            className={inputCls}
            value={emailTemplateId || ""}
            onChange={(e) => onEmailTemplateIdChange(e.target.value || null)}
          >
            <option value="">Select a template...</option>
            {activeTemplates.filter((t) => t.is_preset).length > 0 && (
              <optgroup label="Presets">
                {activeTemplates
                  .filter((t) => t.is_preset)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            )}
            {activeTemplates.filter((t) => !t.is_preset).length > 0 && (
              <optgroup label="Custom Templates">
                {activeTemplates
                  .filter((t) => !t.is_preset)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </FormField>

        <FormField label="Subject Line" required>
          <input
            className={inputCls}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. Time for your seasonal tune-up!"
          />
        </FormField>

        <FormField label="Preview Text">
          <input
            className={inputCls}
            value={previewText}
            onChange={(e) => onPreviewTextChange(e.target.value)}
            placeholder="Shows after subject in inbox (optional)"
          />
          <p className="text-xs text-ds-text-lt mt-1">
            Appears in email client preview, 40-130 characters recommended
          </p>
        </FormField>

        <TemplateVariableBar onInsert={(t) => onSubjectChange(subject + t)} />
      </div>
    </Card>
  );
}
