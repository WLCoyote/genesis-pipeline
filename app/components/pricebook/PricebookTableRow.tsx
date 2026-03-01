"use client";

import type { PricebookItem } from "@/lib/types";

// Refrigerant dot indicator
const REFRIGERANT_COLORS: Record<string, string> = {
  "R-410A": "bg-pink-400",
  "R-22": "bg-green-500",
  "R-454B": "bg-gray-400 ring-2 ring-red-400",
  "R-32": "bg-blue-400 ring-2 ring-green-400",
  "R-134A": "bg-sky-300",
  "R-404A": "bg-orange-400",
  "R-290": "bg-gray-300 ring-2 ring-red-400",
};

// Category tag colors
const CATEGORY_TAG_COLORS: Record<string, string> = {
  labor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  material: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  indoor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  outdoor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  equipment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  addon: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  accessory: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  equipment_warranty: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  labor_warranty: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  service_plan: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  maintenance_plan: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cased_coil: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  rebate: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  exclusion: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  electrical: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  controls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

interface PricebookTableRowProps {
  item: PricebookItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: PricebookItem) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}

function formatCurrency(amount: number | null) {
  if (amount == null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function calcMargin(price: number | null, cost: number | null) {
  if (!price || !cost || price === 0) return null;
  return ((price - cost) / price) * 100;
}

export default function PricebookTableRow({
  item,
  isSelected,
  onToggleSelect,
  onEdit,
  onDeactivate,
  onReactivate,
  onToggleFavorite,
}: PricebookTableRowProps) {
  const margin = calcMargin(item.unit_price, item.cost);
  const isNegativeMargin = margin !== null && margin < 0;

  const refrigerantColor = item.refrigerant_type
    ? REFRIGERANT_COLORS[item.refrigerant_type]
    : null;

  const categoryTagColor =
    CATEGORY_TAG_COLORS[item.category] ||
    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";

  const categoryLabel = item.category.replace(/_/g, " ");

  // Margin color thresholds
  let marginColor = "text-ds-gray-lt dark:text-gray-500";
  if (margin !== null) {
    if (margin >= 40) marginColor = "text-ds-green dark:text-green-400";
    else if (margin >= 20) marginColor = "text-ds-text-lt dark:text-gray-300";
    else if (margin >= 0) marginColor = "text-ds-yellow dark:text-yellow-400";
    else marginColor = "text-ds-red dark:text-red-400 font-semibold";
  }

  // Source badge
  let sourceBadge: { label: string; classes: string };
  if (item.hcp_type === "service") {
    sourceBadge = {
      label: "HCP Service",
      classes: "bg-ds-yellow-bg text-amber-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    };
  } else if (item.hcp_type === "material") {
    sourceBadge = {
      label: "HCP Material",
      classes: "bg-ds-green-bg text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
  } else {
    sourceBadge = {
      label: "Pipeline",
      classes: "bg-ds-blue-bg text-ds-blue dark:bg-blue-900/30 dark:text-blue-400",
    };
  }

  return (
    <tr
      className={`group border-b border-ds-border dark:border-gray-700 transition-colors ${
        isNegativeMargin
          ? "bg-[#fff8f8] dark:bg-red-950/20"
          : "hover:bg-ds-bg/60 dark:hover:bg-gray-700/50"
      } ${!item.is_active ? "opacity-50" : ""}`}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="rounded border-ds-border dark:border-gray-600"
        />
      </td>

      {/* Refrigerant dot + Favorite */}
      <td className="px-1 py-3 w-8 text-center">
        {refrigerantColor ? (
          <span
            title={item.refrigerant_type!}
            className={`inline-block w-2.5 h-2.5 rounded-full ${refrigerantColor} flex-shrink-0`}
          />
        ) : null}
      </td>

      {/* Name + category tag */}
      <td className="px-3 py-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => onToggleFavorite(item.id, item.is_favorite)}
            className={`mt-0.5 text-sm transition-colors flex-shrink-0 ${
              item.is_favorite
                ? "text-amber-400"
                : "text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"
            }`}
            title={item.is_favorite ? "Remove from Quick Picks" : "Add to Quick Picks"}
          >
            ★
          </button>
          <div className="min-w-0">
            <div className="font-semibold text-ds-text dark:text-gray-100 text-[13px] leading-tight">
              {item.display_name}
            </div>
            {item.spec_line && (
              <div className="text-[11px] text-ds-gray dark:text-gray-500 mt-0.5 truncate">
                {item.spec_line}
              </div>
            )}
            <span
              className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${categoryTagColor}`}
            >
              {categoryLabel}
            </span>
          </div>
        </div>
      </td>

      {/* Brand */}
      <td className="px-3 py-3 text-[13px] text-ds-text-lt dark:text-gray-400">
        {item.manufacturer || "—"}
      </td>

      {/* Price */}
      <td className="px-3 py-3 text-right text-[13px] text-ds-text dark:text-gray-300 font-medium tabular-nums">
        {formatCurrency(item.unit_price)}
      </td>

      {/* Cost */}
      <td className="px-3 py-3 text-right text-[13px] text-ds-text-lt dark:text-gray-400 tabular-nums">
        {formatCurrency(item.cost)}
      </td>

      {/* Margin */}
      <td className="px-3 py-3 text-right text-[13px] tabular-nums">
        {margin !== null ? (
          <span className={`flex items-center justify-end gap-1 ${marginColor}`}>
            {isNegativeMargin && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {margin.toFixed(1)}%
          </span>
        ) : (
          <span className="text-ds-gray-lt dark:text-gray-500">—</span>
        )}
      </td>

      {/* Source badge */}
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sourceBadge.classes}`}
        >
          {sourceBadge.label}
        </span>
      </td>

      {/* Status dot */}
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            item.is_active
              ? "bg-ds-green-lt"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
          title={item.is_active ? "Active" : "Inactive"}
        />
      </td>

      {/* Hover actions */}
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-ds-blue-bg text-ds-blue hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
          >
            Edit
          </button>
          {item.is_active ? (
            <button
              onClick={() => onDeactivate(item.id)}
              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-ds-red-bg text-ds-red hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => onReactivate(item.id)}
              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-ds-green-bg text-ds-green hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
            >
              Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
