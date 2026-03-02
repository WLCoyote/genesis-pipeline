"use client";

import type { UserSlim } from "./types";
import Button from "@/app/components/ui/Button";

interface Props {
  estimateNumber: string | null;
  users: UserSlim[];
  assignedTo: string;
  onAssignedToChange: (userId: string) => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onSend: () => void;
  draftSaving: boolean;
  draftSaved: boolean;
  saving: boolean;
  canSend: boolean;
}

export default function QuoteBuilderTopbar({
  estimateNumber,
  users,
  assignedTo,
  onAssignedToChange,
  onSaveDraft,
  onPreview,
  onSend,
  draftSaving,
  draftSaved,
  saving,
  canSend,
}: Props) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 shrink-0">
      {/* Left: breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Quotes</span>
        <span>→</span>
        <span className="font-display text-ds-text font-normal">
          {estimateNumber ? `Edit: ${estimateNumber}` : "New Quote"}
        </span>
      </div>

      {/* Right: assignment + buttons */}
      <div className="flex items-center gap-3">
        <select
          value={assignedTo}
          onChange={(e) => onAssignedToChange(e.target.value)}
          className="px-2.5 py-1.5 border border-ds-border dark:border-gray-600 rounded-lg bg-ds-bg dark:bg-gray-700 text-ds-text text-xs font-medium"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>

        <Button
          variant="secondary"
          size="xs"
          onClick={onSaveDraft}
          disabled={draftSaving}
          className="text-ds-gray hover:border-ds-blue hover:text-ds-blue"
        >
          {draftSaving ? "Saving..." : draftSaved ? "Saved ✓" : "Save Draft"}
        </Button>

        <Button
          variant="secondary"
          size="xs"
          onClick={onPreview}
          className="text-ds-gray hover:border-ds-blue hover:text-ds-blue"
        >
          Preview
        </Button>

        <Button
          variant="warning"
          size="xs"
          onClick={onSend}
          disabled={!canSend || saving}
          className="shadow-sm"
        >
          {saving ? "Creating..." : "Send to Customer"}
        </Button>
      </div>
    </div>
  );
}
