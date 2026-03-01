"use client";

import { useRef } from "react";
import { SequenceStep, FollowUpChannel } from "@/lib/types";

interface SequenceStepCardProps {
  step: SequenceStep;
  index: number;
  isLast: boolean;
  onUpdate: (field: keyof SequenceStep, value: any) => void;
  onRemove: () => void;
  onFocusTextarea: (el: HTMLTextAreaElement) => void;
  canRemove: boolean;
}

const channelOptions: { value: FollowUpChannel; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
];

const channelCircleColors: Record<string, string> = {
  sms: "bg-gradient-to-br from-[#1565c0] to-[#1e88e5]",
  email: "bg-gradient-to-br from-[#e65100] to-[#ff6d00]",
  call: "bg-gradient-to-br from-[#2e7d32] to-[#43a047]",
};

const channelBadgeColors: Record<string, string> = {
  sms: "bg-ds-blue-bg text-ds-blue dark:bg-blue-900/30 dark:text-blue-400",
  email: "bg-ds-orange-bg text-ds-orange dark:bg-orange-900/30 dark:text-orange-400",
  call: "bg-ds-green-bg text-ds-green dark:bg-green-900/30 dark:text-green-400",
};

const channelBorderColors: Record<string, string> = {
  sms: "border-l-[#1565c0]",
  email: "border-l-[#e65100]",
  call: "border-l-[#2e7d32]",
};

const channelIcons: Record<string, string> = {
  sms: "💬",
  email: "✉️",
  call: "📞",
};

export default function SequenceStepCard({
  step,
  index,
  isLast,
  onUpdate,
  onRemove,
  onFocusTextarea,
  canRemove,
}: SequenceStepCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const circleColor = channelCircleColors[step.channel] || channelCircleColors.sms;
  const badgeColor = channelBadgeColors[step.channel] || channelBadgeColors.sms;
  const borderColor = channelBorderColors[step.channel] || channelBorderColors.sms;
  const icon = channelIcons[step.channel] || "📋";

  const charCount = step.template.length;

  return (
    <div className="flex gap-0">
      {/* Connector column */}
      <div className="flex flex-col items-center w-12 shrink-0 pt-5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] z-10 ${circleColor}`}
        >
          {icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-4 bg-ds-border dark:bg-gray-600 mt-1" />
        )}
      </div>

      {/* Step card */}
      <div
        className={`flex-1 bg-ds-card dark:bg-gray-800 border-[1.5px] border-ds-border dark:border-gray-700 rounded-xl my-2 shadow-ds overflow-hidden hover:border-ds-blue/25 transition-colors border-l-[3px] ${borderColor}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ds-border dark:border-gray-700 bg-ds-bg/50 dark:bg-gray-700/30 flex-wrap">
          {/* Channel badge */}
          <span className={`text-[10px] font-black tracking-[1.5px] uppercase px-2.5 py-1 rounded-[6px] ${badgeColor}`}>
            {icon} {step.channel}
          </span>

          {/* Day input */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-ds-gray dark:text-gray-400 font-bold">Day</label>
            <input
              type="number"
              min={0}
              value={step.day_offset}
              onChange={(e) => onUpdate("day_offset", parseInt(e.target.value) || 0)}
              className="w-[52px] px-2 py-1.5 text-center border-[1.5px] border-ds-border dark:border-gray-600 rounded-[7px] font-display text-[16px] font-black text-ds-text dark:text-gray-100 bg-ds-card dark:bg-gray-700 focus:border-ds-blue outline-none"
            />
          </div>

          {/* Channel select */}
          <select
            value={step.channel}
            onChange={(e) => onUpdate("channel", e.target.value)}
            className="px-2.5 py-1.5 border-[1.5px] border-ds-border dark:border-gray-600 rounded-[7px] text-[12px] font-bold text-ds-text dark:text-gray-100 bg-ds-card dark:bg-gray-700 focus:border-ds-blue cursor-pointer outline-none"
          >
            {channelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Call task toggle (shown for call channel) */}
          {step.channel === "call" && (
            <label
              className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[6px] border cursor-pointer transition-colors ${
                step.is_call_task
                  ? "bg-ds-green-bg dark:bg-green-900/30 border-ds-green/30 text-ds-green dark:text-green-400"
                  : "text-ds-gray dark:text-gray-400 border-ds-border dark:border-gray-600"
              }`}
            >
              <input
                type="checkbox"
                checked={step.is_call_task}
                onChange={(e) => onUpdate("is_call_task", e.target.checked)}
                className="sr-only"
              />
              📋 Call Task
            </label>
          )}

          {/* Remove button */}
          {canRemove && (
            <button
              onClick={onRemove}
              className="ml-auto text-[11px] text-ds-red font-bold bg-transparent border-none cursor-pointer px-2 py-1 rounded-[5px] hover:bg-ds-red-bg transition-colors"
            >
              ✕ Remove
            </button>
          )}
        </div>

        {/* Template area */}
        <div className="px-4 py-3.5">
          <textarea
            ref={textareaRef}
            value={step.template}
            onChange={(e) => onUpdate("template", e.target.value)}
            onFocus={() => {
              if (textareaRef.current) onFocusTextarea(textareaRef.current);
            }}
            rows={3}
            placeholder={step.is_call_task ? "Call task notes..." : "Message template..."}
            className={`w-full min-h-[72px] px-3 py-2.5 border-[1.5px] rounded-lg text-[13px] leading-relaxed resize-y outline-none transition-colors ${
              step.is_call_task
                ? "bg-ds-green-bg dark:bg-green-900/20 border-ds-green/25 dark:border-green-800 italic text-ds-text-lt dark:text-gray-400 focus:border-ds-green"
                : "bg-ds-bg dark:bg-gray-700 border-ds-border dark:border-gray-600 text-ds-text dark:text-gray-100 focus:border-ds-blue focus:bg-white dark:focus:bg-gray-600"
            }`}
          />
          <div className="text-right mt-1">
            {step.is_call_task ? (
              <span className="text-[10px] text-ds-gray dark:text-gray-500">
                Call task note — not sent to customer
              </span>
            ) : (
              <span className={`text-[10px] ${charCount > 160 ? "text-ds-orange font-bold" : "text-ds-gray-lt dark:text-gray-500"}`}>
                {charCount} chars
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
