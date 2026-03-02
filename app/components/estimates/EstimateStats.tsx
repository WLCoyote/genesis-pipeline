"use client";

import StatCard from "@/app/components/ui/StatCard";

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
      color: "blue" as const,
      sub: `${pipelineCount} active estimates`,
    },
    {
      label: "Unsent Quotes",
      value: unsentCount.toString(),
      color: "orange" as const,
      sub: "Need to be sent",
    },
    {
      label: "Won This Month",
      value: wonThisMonth.toString(),
      color: "green" as const,
      sub: `${formatK(wonAmount)} closed`,
    },
    {
      label: "Avg Quote Value",
      value: formatK(avgQuoteValue),
      color: "text" as const,
      sub: "Per estimate",
    },
    {
      label: "Close Rate",
      value: `${closeRate}%`,
      color: "blue" as const,
      sub: "Last 90 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          color={stat.color}
          subtext={stat.sub}
        />
      ))}
    </div>
  );
}
