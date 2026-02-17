interface StatusCount {
  status: string;
  count: number;
}

interface PipelineCardsProps {
  counts: StatusCount[];
  totalValue: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700" },
  snoozed: { label: "Snoozed", color: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700" },
  sent: { label: "Sent", color: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700" },
  won: { label: "Won", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700" },
  lost: { label: "Lost", color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700" },
  dormant: { label: "Dormant", color: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

export default function PipelineCards({ counts, totalValue }: PipelineCardsProps) {
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {/* Total card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Estimates</div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
        </div>
      </div>

      {/* Status cards */}
      {Object.entries(statusConfig).map(([status, config]) => {
        const found = counts.find((c) => c.status === status);
        return (
          <div
            key={status}
            className={`rounded-lg border p-4 ${config.color}`}
          >
            <div className="text-2xl font-bold">{found?.count || 0}</div>
            <div className="text-xs mt-1 opacity-75">{config.label}</div>
          </div>
        );
      })}
    </div>
  );
}
