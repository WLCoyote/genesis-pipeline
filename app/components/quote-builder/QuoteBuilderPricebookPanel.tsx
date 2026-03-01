"use client";

import { useMemo } from "react";
import type { PricebookItemSlim, TierForm } from "./types";
import { formatCurrency, CATEGORY_TABS, CATEGORY_ORDER } from "./utils";

interface Props {
  pricebookItems: PricebookItemSlim[];
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  targetTier: 1 | 2 | 3;
  onTargetTierChange: (t: 1 | 2 | 3) => void;
  tiers: TierForm[];
  onAddItem: (tierNumber: number, item: PricebookItemSlim, qty?: number) => void;
}

export default function QuoteBuilderPricebookPanel({
  pricebookItems,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  targetTier,
  onTargetTierChange,
  tiers,
  onAddItem,
}: Props) {
  // Favorites
  const favorites = useMemo(
    () => pricebookItems.filter((p) => p.is_favorite).slice(0, 4),
    [pricebookItems]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    const tab = CATEGORY_TABS.find((t) => t.key === categoryFilter);
    return pricebookItems.filter((item) => {
      // Category filter
      if (tab && tab.match.length > 0 && !tab.match.includes(item.category)) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.display_name.toLowerCase().includes(q) &&
          !item.manufacturer?.toLowerCase().includes(q) &&
          !item.model_number?.toLowerCase().includes(q) &&
          !item.part_number?.toLowerCase().includes(q) &&
          !item.spec_line?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [pricebookItems, search, categoryFilter]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups = new Map<string, PricebookItemSlim[]>();
    for (const item of filteredItems) {
      const cat = item.category || "equipment";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    return [...groups.entries()].sort(
      (a, b) =>
        (CATEGORY_ORDER[a[0]]?.order ?? 99) - (CATEGORY_ORDER[b[0]]?.order ?? 99)
    );
  }, [filteredItems]);

  // Check if item is already in target tier
  const targetTierItems = tiers[targetTier - 1]?.items || [];
  const targetItemIds = new Set(targetTierItems.map((i) => i.pricebook_item_id));

  return (
    <div className="w-80 shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header + search */}
      <div className="px-4 pt-3.5 pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100 mb-2.5">
          Pricebook
        </div>
        <input
          type="text"
          placeholder={`Search ${pricebookItems.length} items...`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border-[1.5px] border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onCategoryFilterChange(tab.key)}
            className={`text-[10px] font-bold tracking-[1px] uppercase px-2.5 py-1 rounded-md border transition-colors ${
              categoryFilter === tab.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick picks / favorites */}
      {favorites.length > 0 && !search && categoryFilter === "all" && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold mb-2">
            ⚡ Quick Picks
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {favorites.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddItem(targetTier, item)}
                disabled={targetItemIds.has(item.id)}
                className="text-left bg-gray-50 dark:bg-gray-700 border-[1.5px] border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-[11px] font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                  {item.display_name}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatCurrency(item.unit_price ?? 0)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groupedItems.map(([cat, items]) => (
          <div key={cat}>
            <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold py-1.5 mt-1 first:mt-0 border-b border-gray-100 dark:border-gray-700 mb-1">
              {CATEGORY_ORDER[cat]?.label ?? cat}
            </div>
            {items.map((item) => {
              const alreadyAdded = targetItemIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate" title={item.display_name}>
                      {item.display_name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {item.model_number || item.part_number || item.spec_line || CATEGORY_ORDER[item.category]?.label || item.category}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatCurrency(item.unit_price ?? 0)}
                  </div>
                  <button
                    onClick={() => onAddItem(targetTier, item)}
                    disabled={alreadyAdded}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                      alreadyAdded
                        ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white"
                    }`}
                  >
                    {alreadyAdded ? "Added" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            No items match your search
          </div>
        )}
      </div>

      {/* Tier target selector */}
      <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 shrink-0 flex items-center gap-2">
        <label className="text-[11px] text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
          Adding to →
        </label>
        <select
          value={targetTier}
          onChange={(e) => onTargetTierChange(parseInt(e.target.value) as 1 | 2 | 3)}
          className="flex-1 px-2.5 py-1.5 border-[1.5px] border-gray-200 dark:border-gray-600 rounded-md text-xs font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 outline-none focus:border-blue-500"
        >
          {tiers.map((tier) => (
            <option key={tier.tier_number} value={tier.tier_number}>
              {tier.is_recommended ? "⭐ " : ""}
              {tier.tier_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
