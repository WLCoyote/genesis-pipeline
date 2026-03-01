"use client";

interface EstimateStatsProps {
  pipelineValue: number;
  pipelineCount: number;
  unsentCount: number;
  wonThisMonth: number;
  wonAmount: number;
  avgQuoteValue: number;
  closeRate: number;
}

export default function EstimateStats({
  pipelineValue,
  pipelineCount,
  unsentCount,
  wonThisMonth,
  wonAmount,
  avgQuoteValue,
  closeRate,
}: EstimateStatsProps) {
  const formatK = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `$${v.toLocaleString()}`;
  };

  const stats = [
    {
      label: "Pipeline Value",
      value: formatK(pipelineValue),
      color: "text-ds-blue",
      sub: `${pipelineCount} active estimates`,
    },
    {
      label: "Unsent Quotes",
      value: unsentCount.toString(),
      color: "text-ds-orange",
      sub: "Need to be sent",
    },
    {
      label: "Won This Month",
      value: wonThisMonth.toString(),
      color: "text-ds-green",
      sub: `${formatK(wonAmount)} closed`,
    },
    {
      label: "Avg Quote Value",
      value: formatK(avgQuoteValue),
      color: "text-ds-text dark:text-gray-100",
      sub: "Per estimate",
    },
    {
      label: "Close Rate",
      value: `${closeRate}%`,
      color: "text-ds-blue",
      sub: "Last 90 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-4 py-4 shadow-ds hover:-translate-y-0.5 transition-transform"
        >
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-ds-gray dark:text-gray-400 mb-1.5">
            {stat.label}
          </div>
          <div className={`font-display text-[32px] font-black leading-none ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-[11px] text-ds-gray dark:text-gray-500 mt-1">
            {stat.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
