"use client";

interface PricebookMarginAlertProps {
  negativeCount: number;
  onShowProblemItems: () => void;
}

export default function PricebookMarginAlert({
  negativeCount,
  onShowProblemItems,
}: PricebookMarginAlertProps) {
  if (negativeCount === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 bg-ds-red-bg dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ds-red text-white text-sm font-bold flex-shrink-0">
        !
      </div>
      <div className="flex-1">
        <span className="text-sm font-semibold text-ds-red dark:text-red-400">
          {negativeCount} item{negativeCount !== 1 ? "s" : ""} with negative margins
        </span>
        <span className="text-xs text-ds-text-lt dark:text-gray-400 ml-2">
          Cost exceeds price — losing money on each sale
        </span>
      </div>
      <button
        onClick={onShowProblemItems}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ds-red text-white hover:bg-red-700 transition-colors flex-shrink-0"
      >
        Show Problem Items
      </button>
    </div>
  );
}
