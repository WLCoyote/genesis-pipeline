"use client";

import FormField, { inputCls } from "@/app/components/ui/FormField";
import Card from "@/app/components/ui/Card";

interface Props {
  sendNow: boolean;
  onSendNowChange: (v: boolean) => void;
  scheduledAt: string;
  onScheduledAtChange: (v: string) => void;
  batchSize: number;
  onBatchSizeChange: (v: number) => void;
  batchIntervalMinutes: number;
  onBatchIntervalChange: (v: number) => void;
  warmupMode: boolean;
  onWarmupModeChange: (v: boolean) => void;
}

export default function CampaignScheduleStep({
  sendNow,
  onSendNowChange,
  scheduledAt,
  onScheduledAtChange,
  batchSize,
  onBatchSizeChange,
  batchIntervalMinutes,
  onBatchIntervalChange,
  warmupMode,
  onWarmupModeChange,
}: Props) {
  return (
    <Card title="Send Schedule">
      <div className="space-y-4">
        {/* Send timing */}
        <FormField label="When to Send">
          <div className="flex gap-3">
            <button
              onClick={() => onSendNowChange(true)}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                sendNow
                  ? "border-ds-blue bg-ds-blue-bg text-ds-blue"
                  : "border-ds-border text-ds-text-lt hover:border-ds-blue/50"
              }`}
            >
              Send Now
            </button>
            <button
              onClick={() => onSendNowChange(false)}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                !sendNow
                  ? "border-ds-blue bg-ds-blue-bg text-ds-blue"
                  : "border-ds-border text-ds-text-lt hover:border-ds-blue/50"
              }`}
            >
              Schedule
            </button>
          </div>
        </FormField>

        {!sendNow && (
          <FormField label="Scheduled Date & Time" required>
            <input
              type="datetime-local"
              className={inputCls}
              value={scheduledAt}
              onChange={(e) => onScheduledAtChange(e.target.value)}
            />
          </FormField>
        )}

        {/* Batch settings */}
        <div className="border-t border-ds-border pt-3">
          <p className="text-xs font-semibold text-ds-text-lt uppercase tracking-wider mb-3">
            Batch Settings
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Batch Size">
              <input
                type="number"
                className={inputCls}
                value={batchSize}
                onChange={(e) => onBatchSizeChange(parseInt(e.target.value) || 50)}
                min={1}
                max={500}
              />
              <p className="text-xs text-ds-text-lt mt-1">Emails per batch</p>
            </FormField>
            <FormField label="Batch Interval">
              <input
                type="number"
                className={inputCls}
                value={batchIntervalMinutes}
                onChange={(e) => onBatchIntervalChange(parseInt(e.target.value) || 60)}
                min={15}
              />
              <p className="text-xs text-ds-text-lt mt-1">Minutes between batches</p>
            </FormField>
          </div>
        </div>

        {/* Warmup */}
        <div className="border-t border-ds-border pt-3">
          <label className="flex items-center gap-2 text-sm text-ds-text">
            <input
              type="checkbox"
              checked={warmupMode}
              onChange={(e) => onWarmupModeChange(e.target.checked)}
            />
            Enable warmup mode
          </label>
          <p className="text-xs text-ds-text-lt mt-1 ml-6">
            Gradually increases batch size over 5 days (25 → 50 → 100 → 200 → 500) to build sender reputation.
          </p>
        </div>
      </div>
    </Card>
  );
}
