"use client";

import { BlockType } from "@/lib/campaign-types";
import { blockTypeLabel } from "@/lib/campaign-blocks";

const BLOCK_TYPES: { type: BlockType; icon: string }[] = [
  { type: "header", icon: "H" },
  { type: "text", icon: "T" },
  { type: "image", icon: "🖼" },
  { type: "button", icon: "▶" },
  { type: "divider", icon: "—" },
  { type: "spacer", icon: "↕" },
  { type: "two-column", icon: "||" },
];

interface Props {
  onAdd: (type: BlockType) => void;
}

export default function BlockPalette({ onAdd }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_TYPES.map(({ type, icon }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-ds-border rounded-lg bg-white hover:bg-ds-blue-bg hover:border-ds-blue text-ds-text transition-colors cursor-pointer"
        >
          <span className="text-sm">{icon}</span>
          {blockTypeLabel(type)}
        </button>
      ))}
    </div>
  );
}
