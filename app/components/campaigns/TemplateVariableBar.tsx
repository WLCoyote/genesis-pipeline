"use client";

import { CAMPAIGN_TOKENS } from "@/lib/campaign-types";

interface Props {
  onInsert: (token: string) => void;
}

export default function TemplateVariableBar({ onInsert }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-ds-text-lt mr-1">Variables:</span>
      {CAMPAIGN_TOKENS.map((token) => (
        <button
          key={token}
          onClick={() => onInsert(token)}
          className="px-2 py-1 text-[11px] font-mono bg-gray-100 border border-ds-border rounded hover:bg-ds-blue-bg hover:border-ds-blue text-ds-text transition-colors cursor-pointer"
        >
          {token}
        </button>
      ))}
    </div>
  );
}
