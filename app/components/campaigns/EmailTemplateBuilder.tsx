"use client";

import { useState, useCallback } from "react";
import { EmailBlock, BlockType } from "@/lib/campaign-types";
import { defaultBlockContent } from "@/lib/campaign-blocks";
import BlockPalette from "./BlockPalette";
import BlockList from "./BlockList";
import BlockEditor from "./BlockEditor";
import EmailPreview from "./EmailPreview";
import TemplateVariableBar from "./TemplateVariableBar";
import Card from "@/app/components/ui/Card";

interface Props {
  initialBlocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  previewText?: string;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function EmailTemplateBuilder({ initialBlocks, onChange, previewText }: Props) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const update = useCallback(
    (newBlocks: EmailBlock[]) => {
      setBlocks(newBlocks);
      onChange(newBlocks);
    },
    [onChange]
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock: EmailBlock = {
        id: generateId(),
        type,
        content: defaultBlockContent(type),
      };
      const newBlocks = [...blocks, newBlock];
      update(newBlocks);
      setSelectedIndex(newBlocks.length - 1);
    },
    [blocks, update]
  );

  const moveUp = useCallback(
    (i: number) => {
      if (i === 0) return;
      const arr = [...blocks];
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      update(arr);
      setSelectedIndex(i - 1);
    },
    [blocks, update]
  );

  const moveDown = useCallback(
    (i: number) => {
      if (i >= blocks.length - 1) return;
      const arr = [...blocks];
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      update(arr);
      setSelectedIndex(i + 1);
    },
    [blocks, update]
  );

  const deleteBlock = useCallback(
    (i: number) => {
      const arr = blocks.filter((_, idx) => idx !== i);
      update(arr);
      if (selectedIndex === i) setSelectedIndex(null);
      else if (selectedIndex !== null && selectedIndex > i)
        setSelectedIndex(selectedIndex - 1);
    },
    [blocks, selectedIndex, update]
  );

  const updateBlockContent = useCallback(
    (content: Record<string, unknown>) => {
      if (selectedIndex === null) return;
      const arr = [...blocks];
      arr[selectedIndex] = { ...arr[selectedIndex], content };
      update(arr);
    },
    [blocks, selectedIndex, update]
  );

  const handleVariableInsert = useCallback((token: string) => {
    navigator.clipboard.writeText(token);
  }, []);

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  if (showPreview) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-ds-text">Email Preview</h3>
          <button
            onClick={() => setShowPreview(false)}
            className="text-sm text-ds-blue hover:underline cursor-pointer"
          >
            Back to Editor
          </button>
        </div>
        <EmailPreview blocks={blocks} previewText={previewText} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variable bar */}
      <TemplateVariableBar onInsert={handleVariableInsert} />

      {/* Block palette */}
      <Card title="Add Block">
        <BlockPalette onAdd={addBlock} />
      </Card>

      {/* Two-panel: block list + editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Blocks">
          <BlockList
            blocks={blocks}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onDelete={deleteBlock}
          />
        </Card>

        <Card title={selectedBlock ? `Edit: ${selectedBlock.type}` : "Select a Block"}>
          {selectedBlock ? (
            <BlockEditor block={selectedBlock} onChange={updateBlockContent} />
          ) : (
            <p className="text-sm text-ds-text-lt py-4 text-center">
              Click a block to edit its content.
            </p>
          )}
        </Card>
      </div>

      {/* Preview toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowPreview(true)}
          className="text-sm text-ds-blue hover:underline cursor-pointer"
        >
          Preview Email →
        </button>
      </div>
    </div>
  );
}
