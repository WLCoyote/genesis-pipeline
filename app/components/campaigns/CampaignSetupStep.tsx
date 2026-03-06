"use client";

import { CampaignType } from "@/lib/campaign-types";
import FormField, { inputCls } from "@/app/components/ui/FormField";
import Card from "@/app/components/ui/Card";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  type: CampaignType;
  onTypeChange: (v: CampaignType) => void;
}

export default function CampaignSetupStep({ name, onNameChange, type, onTypeChange }: Props) {
  return (
    <Card title="Campaign Setup">
      <div className="space-y-4">
        <FormField label="Campaign Name" required>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Spring Tune-Up Reminder"
          />
        </FormField>

        <FormField label="Campaign Type" required>
          <div className="flex gap-3">
            {(["email", "sms"] as CampaignType[]).map((t) => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  type === t
                    ? "border-ds-blue bg-ds-blue-bg text-ds-blue"
                    : "border-ds-border text-ds-text-lt hover:border-ds-blue/50"
                }`}
              >
                {t === "email" ? "Email Campaign" : "SMS Campaign"}
              </button>
            ))}
          </div>
          {type === "sms" && (
            <p className="text-xs text-ds-orange mt-2">
              SMS campaigns require A2P 10DLC approval. Messages will fail until approved.
            </p>
          )}
        </FormField>
      </div>
    </Card>
  );
}
