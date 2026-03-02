interface AnalyticsStatsProps {
  pipelineValue: number;
  closeRate: number;
  avgDaysToClose: number;
  revenueWonThisMonth: number;
  activeEstimates: number;
}

export default function AnalyticsStats({
  pipelineValue,
  closeRate,
  avgDaysToClose,
  revenueWonThisMonth,
  activeEstimates,
}: AnalyticsStatsProps) {
  const cards = [
    {
      label: "Pipeline Value",
      value: `$${pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      color: "from-[#1565c0] to-[#1e88e5]",
    },
    {
      label: "Close Rate (90d)",
      value: `${Math.round(closeRate)}%`,
      color: "from-[#2e7d32] to-[#43a047]",
    },
    {
      label: "Avg Days to Close",
      value: avgDaysToClose > 0 ? `${avgDaysToClose}d` : "—",
      color: "from-[#e65100] to-[#ff6d00]",
    },
    {
      label: "Won This Month",
      value: `$${revenueWonThisMonth.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
      color: "from-[#2e7d32] to-[#43a047]",
    },
    {
      label: "Active Estimates",
      value: String(activeEstimates),
      color: "from-[#4527a0] to-[#7c4dff]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-gradient-to-br ${card.color} rounded-xl p-4 text-white shadow-ds`}
        >
          <div className="font-display text-[24px] font-black tracking-tight">
            {card.value}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/70 mt-1">
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
