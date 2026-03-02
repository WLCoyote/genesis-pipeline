interface RepRow {
  name: string;
  activeEstimates: number;
  pipelineValue: number;
  closeRate: number;
  lastActivity: string | null;
}

interface RepPerformanceProps {
  reps: RepRow[];
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function RepPerformance({ reps }: RepPerformanceProps) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      <div className="border-b border-ds-border dark:border-gray-700 px-5 py-3">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100">
          Rep Performance
        </div>
      </div>

      {reps.length === 0 ? (
        <div className="p-5 text-[13px] text-ds-gray-lt text-center">
          No rep data available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ds-border dark:border-gray-700 bg-ds-bg dark:bg-gray-900/50">
                <th className="text-left px-5 py-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-ds-gray dark:text-gray-400">
                  Rep
                </th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-ds-gray dark:text-gray-400">
                  Active
                </th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-ds-gray dark:text-gray-400">
                  Pipeline $
                </th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-ds-gray dark:text-gray-400">
                  Close Rate
                </th>
                <th className="text-right px-5 py-2.5 text-[11px] font-bold uppercase tracking-[1.5px] text-ds-gray dark:text-gray-400">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr
                  key={rep.name}
                  className="border-b border-ds-border/50 dark:border-gray-700/50 hover:bg-ds-bg dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-5 py-3 font-bold text-ds-text dark:text-gray-100">
                    {rep.name}
                  </td>
                  <td className="px-5 py-3 text-right text-ds-text dark:text-gray-300">
                    {rep.activeEstimates}
                  </td>
                  <td className="px-5 py-3 text-right font-display font-bold text-ds-text dark:text-gray-100">
                    ${rep.pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`font-bold ${
                        rep.closeRate >= 50
                          ? "text-ds-green"
                          : rep.closeRate >= 25
                          ? "text-ds-orange"
                          : "text-ds-red"
                      }`}
                    >
                      {Math.round(rep.closeRate)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-ds-gray dark:text-gray-400">
                    {timeAgo(rep.lastActivity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
