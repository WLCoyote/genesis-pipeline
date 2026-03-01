"use client";

import type { PricebookItem } from "@/lib/types";

interface PricebookStatsProps {
  items: PricebookItem[];
}

export default function PricebookStats({ items }: PricebookStatsProps) {
  const activeItems = items.filter((i) => i.is_active);
  const totalItems = activeItems.length;

  // Average margin
  const marginsArr = activeItems
    .filter((i) => i.unit_price && i.cost && i.unit_price > 0)
    .map((i) => ((i.unit_price! - i.cost!) / i.unit_price!) * 100);
  const avgMargin =
    marginsArr.length > 0
      ? marginsArr.reduce((a, b) => a + b, 0) / marginsArr.length
      : 0;

  // Negative margin count
  const negativeMarginCount = activeItems.filter(
    (i) => i.unit_price && i.cost && i.unit_price > 0 && i.cost > i.unit_price
  ).length;

  // HCP synced count
  const hcpSyncedCount = activeItems.filter((i) => i.hcp_uuid).length;

  // Manual price count
  const manualPriceCount = activeItems.filter((i) => i.manual_price).length;

  const stats = [
    {
      label: "Total Items",
      value: totalItems.toLocaleString(),
      color: "text-ds-blue",
    },
    {
      label: "Avg Margin",
      value: `${avgMargin.toFixed(1)}%`,
      color: avgMargin >= 30 ? "text-ds-green" : avgMargin >= 15 ? "text-ds-yellow" : "text-ds-red",
    },
    {
      label: "Margin Alerts",
      value: negativeMarginCount.toString(),
      color: negativeMarginCount > 0 ? "text-ds-red" : "text-ds-green",
    },
    {
      label: "HCP Synced",
      value: hcpSyncedCount.toLocaleString(),
      color: "text-ds-blue-lt",
    },
    {
      label: "Manual Price",
      value: manualPriceCount.toString(),
      color: "text-ds-gray",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl p-4 shadow-ds"
        >
          <div className="text-[11px] font-body font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400 mb-1">
            {stat.label}
          </div>
          <div className={`font-display text-[30px] font-black leading-none ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
