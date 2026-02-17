import { EstimateOption } from "@/lib/types";

interface OptionsListProps {
  options: EstimateOption[];
  totalAmount: number | null;
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  declined: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
};

export default function OptionsList({ options, totalAmount }: OptionsListProps) {
  if (options.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Options
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">No options on this estimate.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Options
        </h2>
        {totalAmount !== null && (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Total: ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {options
          .sort((a, b) => a.option_number - b.option_number)
          .map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Option {opt.option_number}
                </div>
                {opt.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {opt.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                {opt.amount !== null && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ${opt.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusStyles[opt.status] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
