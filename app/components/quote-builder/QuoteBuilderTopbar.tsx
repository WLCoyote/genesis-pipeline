"use client";

import type { UserSlim } from "./types";

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
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-7 flex items-center justify-between h-14 shrink-0">
      {/* Left: breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Quotes</span>
        <span>→</span>
        <span className="text-gray-900 dark:text-gray-100 font-bold">
          {estimateNumber ? `Edit: ${estimateNumber}` : "New Quote"}
        </span>
      </div>

      {/* Right: assignment + buttons */}
      <div className="flex items-center gap-3">
        <select
          value={assignedTo}
          onChange={(e) => onAssignedToChange(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs font-medium"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>

        <button
          onClick={onSaveDraft}
          disabled={draftSaving}
          className="px-4 py-1.5 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
        >
          {draftSaving ? "Saving..." : draftSaved ? "Saved ✓" : "Save Draft"}
        </button>

        <button
          onClick={onPreview}
          className="px-4 py-1.5 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Preview
        </button>

        <button
          onClick={onSend}
          disabled={!canSend || saving}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Send to Customer"}
        </button>
      </div>
    </div>
  );
}
