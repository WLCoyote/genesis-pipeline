import { EstimateOption } from "@/lib/types";

interface OptionsListProps {
  options: EstimateOption[];
  totalAmount: number | null;
}

const statusStyles: Record<string, string> = {
  pending: "bg-ds-yellow-bg text-[#795500] dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-ds-green-bg text-ds-green dark:bg-green-900/30 dark:text-green-300",
  declined: "bg-ds-red-bg text-ds-red dark:bg-red-900/30 dark:text-red-300",
};

export default function OptionsList({ options, totalAmount }: OptionsListProps) {
  if (options.length === 0) {
    return (
      <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4">
        <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400 mb-3">
          Options
        </div>
        <p className="text-[13px] text-ds-gray-lt dark:text-gray-500">No options on this estimate.</p>
      </div>
    );
  }

  return (
    <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400">
          Options
        </div>
        {totalAmount !== null && (
          <span className="font-display text-lg font-black text-ds-text dark:text-gray-100">
            ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
        )}
      </div>
      <div className="space-y-0">
        {options
          .sort((a, b) => a.option_number - b.option_number)
          .map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between py-2.5 border-b border-ds-border/50 dark:border-gray-700/50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ds-text dark:text-gray-100">
                  Option {opt.option_number}
                </div>
                {opt.description && (
                  <div className="text-[12px] text-ds-text-lt dark:text-gray-400 truncate">
                    {opt.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                {opt.amount !== null && (
                  <span className="text-[13px] font-bold text-ds-text dark:text-gray-300">
                    ${opt.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold capitalize ${
                    statusStyles[opt.status] || "bg-ds-bg text-ds-gray dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {opt.status}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
