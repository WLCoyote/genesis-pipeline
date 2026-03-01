"use client";

interface SequenceHeaderProps {
  name: string;
  isActive: boolean;
  stepCount: number;
  daySpan: number;
  onToggle: () => void;
  toggling: boolean;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string;
}

export default function SequenceHeader({
  name,
  isActive,
  stepCount,
  daySpan,
  onToggle,
  toggling,
  onSave,
  saving,
  saved,
  error,
}: SequenceHeaderProps) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-5 py-4 flex flex-wrap items-center gap-4 shadow-ds">
      {/* Sequence name */}
      <h2 className="font-display text-[22px] font-black text-ds-text dark:text-gray-100 uppercase tracking-[1px] flex-1 min-w-0 truncate">
        {name}
      </h2>

      {/* Status badge */}
      {isActive ? (
        <span className="flex items-center gap-1.5 bg-ds-green-bg dark:bg-green-900/30 border border-ds-green/40 text-ds-green dark:text-green-400 px-3 py-1.5 rounded-[7px] text-[11px] font-bold whitespace-nowrap">
          <span className="w-[5px] h-[5px] rounded-full bg-current" />
          Active
        </span>
      ) : (
        <span className="flex items-center gap-1.5 bg-ds-yellow-bg dark:bg-yellow-900/30 border border-ds-yellow/40 text-[#795500] dark:text-yellow-400 px-3 py-1.5 rounded-[7px] text-[11px] font-bold whitespace-nowrap">
          ⏸ Paused
        </span>
      )}

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-5">
        <div className="text-center">
          <div className="font-display text-[20px] font-black text-ds-text dark:text-gray-100 leading-none">
            {stepCount}
          </div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-ds-gray dark:text-gray-500 mt-0.5">
            Steps
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-[20px] font-black text-ds-text dark:text-gray-100 leading-none">
            {daySpan}
          </div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-ds-gray dark:text-gray-500 mt-0.5">
            Day Span
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-ds-border dark:bg-gray-600 hidden sm:block" />

      {/* Feedback */}
      {saved && (
        <span className="text-[13px] text-ds-green dark:text-green-400 font-bold">Saved ✓</span>
      )}
      {error && (
        <span className="text-[13px] text-ds-red font-bold">{error}</span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={toggling}
          className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold border border-ds-border dark:border-gray-600 text-ds-gray dark:text-gray-300 hover:border-ds-blue hover:text-ds-blue disabled:opacity-50 transition-colors cursor-pointer bg-transparent"
        >
          {toggling ? "..." : isActive ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-[7px] rounded-[7px] text-[13px] font-bold bg-ds-blue text-white shadow-[0_3px_10px_rgba(21,101,192,0.3)] hover:bg-ds-blue-lt disabled:opacity-50 transition-colors cursor-pointer border-none"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}
