"use client";

import { EmailBlock } from "@/lib/campaign-types";
import { blockTypeLabel } from "@/lib/campaign-blocks";

interface Props {
  blocks: EmailBlock[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (index: number) => void;
}

export default function BlockList({
  blocks,
  selectedIndex,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-8 text-ds-text-lt text-sm">
        No blocks yet. Add blocks from the palette above.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        const isSelected = selectedIndex === i;
        return (
          <div
            key={block.id}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? "bg-ds-blue-bg border border-ds-blue"
                : "bg-white border border-ds-border hover:border-ds-blue/50"
            }`}
          >
            <span className="text-xs font-medium text-ds-text-lt w-5 text-center">
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-ds-text">
              {blockTypeLabel(block.type)}
            </span>
            <span className="text-xs text-ds-text-lt truncate max-w-[120px]">
              {getBlockPreview(block)}
            </span>
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(i); }}
                disabled={i === 0}
                className="w-6 h-6 text-xs rounded hover:bg-ds-blue-bg disabled:opacity-30 text-ds-text-lt cursor-pointer"
              >
                ▲
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(i); }}
                disabled={i === blocks.length - 1}
                className="w-6 h-6 text-xs rounded hover:bg-ds-blue-bg disabled:opacity-30 text-ds-text-lt cursor-pointer"
              >
                ▼
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                className="w-6 h-6 text-xs rounded hover:bg-red-50 text-ds-red cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getBlockPreview(block: EmailBlock): string {
  switch (block.type) {
    case "header":
      return String(block.content.title || "");
    case "text":
      return stripHtml(String(block.content.html || "")).slice(0, 40);
    case "button":
      return String(block.content.text || "");
    case "image":
      return String(block.content.alt || "Image");
    default:
      return "";
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
