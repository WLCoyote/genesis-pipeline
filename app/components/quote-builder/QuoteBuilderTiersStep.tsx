"use client";

import type { TierForm, TierTotals, FinancingPlanFull, PricebookItemSlim } from "./types";
import {
  formatCurrency,
  calculateMonthly,
  calculateTierCost,
  groupItemsByCategory,
  TIER_BADGES,
} from "./utils";

interface Props {
  tiers: TierForm[];
  tierTotals: TierTotals[];
  targetTier: 1 | 2 | 3;
  selectedFinancingPlan: FinancingPlanFull | null;
  includeTax: boolean;
  taxRate: number | null;
  pricebookItems: PricebookItemSlim[];
  onSetTargetTier: (t: 1 | 2 | 3) => void;
  onRemoveItem: (tierNumber: number, pbItemId: string) => void;
  onToggleAddon: (tierNumber: number, pbItemId: string, checked: boolean) => void;
  onUpdateTierField: (tierNumber: number, field: keyof TierForm, value: unknown) => void;
  onSetRecommended: (tierNumber: number) => void;
  onUpdateItemQuantity: (tierNumber: number, pbItemId: string, qty: number) => void;
  onUpdateItemPrice: (tierNumber: number, pbItemId: string, price: number) => void;
  onToggleTax: (v: boolean) => void;
}

export default function QuoteBuilderTiersStep({
  tiers,
  tierTotals,
  targetTier,
  selectedFinancingPlan,
  includeTax,
  taxRate,
  pricebookItems,
  onSetTargetTier,
  onRemoveItem,
  onToggleAddon,
  onUpdateTierField,
  onSetRecommended,
  onUpdateItemQuantity,
  onUpdateItemPrice,
  onToggleTax,
}: Props) {
  // Filter pricebook items to rebate category for the rebate picker
  const availableRebates = pricebookItems.filter((p) => p.category === "rebate");
  const getCashTotal = (total: number) => {
    if (includeTax && taxRate != null) {
      const tax = Math.round(total * taxRate * 100) / 100;
      return Math.round((total + tax) * 100) / 100;
    }
    return total;
  };

  const getMonthly = (total: number) => {
    if (!selectedFinancingPlan || total <= 0) return null;
    const cash = getCashTotal(total);
    return calculateMonthly(cash, selectedFinancingPlan.fee_pct, selectedFinancingPlan.months);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
          Equipment Tiers — Add items from pricebook →
        </h3>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeTax}
            onChange={(e) => onToggleTax(e.target.checked)}
            className="w-3.5 h-3.5 rounded"
          />
          Include sales tax
          {includeTax && taxRate != null && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              ({(taxRate * 100).toFixed(1)}%)
            </span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {tiers.map((tier, idx) => {
          const totals = tierTotals[idx];
          const badge = TIER_BADGES[tier.tier_number];
          const isTarget = targetTier === tier.tier_number;
          const cash = getCashTotal(totals?.total || 0);
          const monthly = getMonthly(totals?.total || 0);
          const categoryGroups = groupItemsByCategory(tier.items);
          const addons = tier.items.filter((i) => i.is_addon);
          const tierCost = calculateTierCost(tier);
          const tierTotal = totals?.total || 0;
          const margin = tierTotal > 0 ? ((tierTotal - tierCost) / tierTotal) * 100 : 0;

          const borderClass = tier.is_recommended
            ? "border-blue-500 shadow-[0_0_0_1px_#3b82f6]"
            : tier.tier_number === 3
              ? "border-orange-400/50"
              : "border-gray-200 dark:border-gray-700";

          const targetClass = isTarget
            ? "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-gray-900"
            : "";

          return (
            <div
              key={tier.tier_number}
              className={`bg-white dark:bg-gray-800 border-[1.5px] ${borderClass} ${targetClass} rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all`}
              onClick={() => onSetTargetTier(tier.tier_number as 1 | 2 | 3)}
            >
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 relative">
                <div
                  className={`text-[9px] font-black tracking-[2px] uppercase inline-block px-2 py-0.5 rounded-full mb-1.5 ${
                    tier.tier_number === 1
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      : tier.tier_number === 2
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {badge?.icon} {badge?.label}
                </div>
                {tier.is_recommended && (
                  <div className="absolute top-2.5 right-3 bg-blue-600 text-white text-[8px] font-black tracking-[1.5px] uppercase px-2 py-0.5 rounded-full">
                    Recommended
                  </div>
                )}
                <input
                  type="text"
                  value={tier.tier_name}
                  onChange={(e) => onUpdateTierField(tier.tier_number, "tier_name", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="block text-lg font-black uppercase tracking-wide text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none w-full p-0"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                />
                <input
                  type="text"
                  value={tier.tagline}
                  onChange={(e) => onUpdateTierField(tier.tier_number, "tagline", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Add tagline..."
                  className="block text-[11px] text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none w-full p-0 mt-0.5 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                {/* Recommended radio */}
                <label
                  className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="radio"
                    name="recommended"
                    checked={tier.is_recommended}
                    onChange={() => onSetRecommended(tier.tier_number)}
                    className="w-3 h-3"
                  />
                  Recommended
                </label>
              </div>

              {/* Mini total bar */}
              <div
                className={`flex items-baseline gap-1.5 px-4 py-2 border-b border-gray-200 dark:border-gray-700 ${
                  tier.tier_number === 1
                    ? "bg-gray-50 dark:bg-gray-700/50"
                    : tier.tier_number === 2
                      ? "bg-blue-50/50 dark:bg-blue-900/10"
                      : "bg-orange-50/50 dark:bg-orange-900/10"
                }`}
              >
                <span
                  className={`text-2xl font-black ${
                    tier.is_recommended
                      ? "text-blue-600 dark:text-blue-400"
                      : tier.tier_number === 3
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-900 dark:text-gray-100"
                  }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {totals?.total ? formatCurrency(cash) : "$0"}
                </span>
                {monthly != null && monthly > 0 && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    · {formatCurrency(monthly)}/mo
                  </span>
                )}
                {tierCost > 0 && (
                  <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                    Cost {formatCurrency(tierCost)} · Margin {formatCurrency(tierTotal - tierCost)} ({margin.toFixed(0)}%)
                  </span>
                )}
              </div>

              {/* Line items by category */}
              <div className="px-2.5 py-2.5 min-h-[80px]" onClick={(e) => e.stopPropagation()}>
                {categoryGroups.length === 0 && tier.items.filter((i) => !i.is_addon).length === 0 && (
                  <div className="text-center py-5 text-xs text-gray-400 dark:text-gray-500 italic">
                    No items yet — add from pricebook →
                  </div>
                )}

                {categoryGroups.map((group) => (
                  <div key={group.slug}>
                    <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold px-1 pt-1.5 pb-1 mt-1 first:mt-0 border-b border-gray-100 dark:border-gray-700 mb-1">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.pricebook_item_id}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs text-gray-900 dark:text-gray-100 group hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: group.dotColor }}
                        />
                        <span className="flex-1 leading-tight truncate">{item.display_name}</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            onUpdateItemQuantity(
                              tier.tier_number,
                              item.pricebook_item_id,
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-10 px-1 py-0.5 text-[10px] text-center border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600 rounded bg-transparent text-gray-500 dark:text-gray-400"
                        />
                        {item.cost != null && item.cost > 0 && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 w-12 text-right shrink-0" title="Cost">
                            {formatCurrency(item.cost)}
                          </span>
                        )}
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_price}
                          onChange={(e) =>
                            onUpdateItemPrice(
                              tier.tier_number,
                              item.pricebook_item_id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 px-1 py-0.5 text-xs text-right font-bold border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600 rounded bg-transparent text-gray-900 dark:text-gray-100"
                        />
                        <button
                          onClick={() => onRemoveItem(tier.tier_number, item.pricebook_item_id)}
                          className="opacity-0 group-hover:opacity-100 text-[11px] text-red-400 hover:text-red-600 px-0.5 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                <button
                  onClick={() => onSetTargetTier(tier.tier_number as 1 | 2 | 3)}
                  className="w-full mt-2 py-1.5 border-[1.5px] border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-xs text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-400 transition-colors"
                >
                  + Add Item to {tier.tier_name}
                </button>
              </div>

              {/* Feature Bullets */}
              <div className="px-2.5 py-2.5 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold mb-1.5">
                  Features (shown on proposal)
                </div>
                {(tier.feature_bullets || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-1.5 mb-1">
                    <span className="text-green-500 text-[10px] shrink-0">✓</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const updated = [...(tier.feature_bullets || [])];
                        updated[bIdx] = e.target.value;
                        onUpdateTierField(tier.tier_number, "feature_bullets", updated);
                      }}
                      className="flex-1 text-[11px] text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none p-0"
                      placeholder="Feature description..."
                    />
                    <button
                      onClick={() => {
                        const updated = (tier.feature_bullets || []).filter((_, i) => i !== bIdx);
                        onUpdateTierField(tier.tier_number, "feature_bullets", updated);
                      }}
                      className="text-[10px] text-gray-300 dark:text-gray-600 hover:text-red-400 px-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...(tier.feature_bullets || []), ""];
                    onUpdateTierField(tier.tier_number, "feature_bullets", updated);
                  }}
                  className="text-[10px] text-blue-500 hover:text-blue-600 font-bold mt-1"
                >
                  + Add Feature
                </button>
              </div>

              {/* Rebates */}
              <div className="px-2.5 py-2.5 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold mb-1.5">
                  Rebates
                </div>
                {(tier.rebates || []).map((rebate) => (
                  <div key={rebate.id} className="flex items-center gap-1.5 mb-1 group">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#4caf50" }}
                    />
                    <span className="flex-1 text-[11px] text-green-700 dark:text-green-400 leading-tight truncate">
                      {rebate.name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rebate.amount}
                      onChange={(e) => {
                        const updated = (tier.rebates || []).map((r) =>
                          r.id === rebate.id ? { ...r, amount: parseFloat(e.target.value) || 0 } : r
                        );
                        onUpdateTierField(tier.tier_number, "rebates", updated);
                      }}
                      className="w-20 px-1 py-0.5 text-xs text-right font-bold border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600 rounded bg-transparent text-green-600 dark:text-green-400"
                    />
                    <button
                      onClick={() => {
                        const updated = (tier.rebates || []).filter((r) => r.id !== rebate.id);
                        onUpdateTierField(tier.tier_number, "rebates", updated);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-300 dark:text-gray-600 hover:text-red-400 px-0.5 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {/* Rebate picker from pricebook */}
                {availableRebates.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => {
                      const pb = availableRebates.find((r) => r.id === e.target.value);
                      if (!pb) return;
                      const already = (tier.rebates || []).some((r) => r.id === pb.id);
                      if (already) return;
                      const updated = [
                        ...(tier.rebates || []),
                        { id: pb.id, name: pb.display_name, amount: pb.unit_price ?? 0 },
                      ];
                      onUpdateTierField(tier.tier_number, "rebates", updated);
                    }}
                    className="mt-1 w-full text-[11px] px-2 py-1 rounded-md border border-dashed border-green-300 dark:border-green-700 bg-transparent text-green-600 dark:text-green-400 outline-none cursor-pointer"
                  >
                    <option value="">+ Add Rebate...</option>
                    {availableRebates
                      .filter((rb) => !(tier.rebates || []).some((r) => r.id === rb.id))
                      .map((rb) => (
                        <option key={rb.id} value={rb.id}>
                          {rb.display_name} — {formatCurrency(rb.unit_price ?? 0)}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1">
                    No rebates in pricebook yet
                  </div>
                )}
                {(tier.rebates || []).some((r) => r.amount > 0) && (
                  <div className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1.5 text-right">
                    -{formatCurrency((tier.rebates || []).reduce((sum, r) => sum + r.amount, 0))} rebates applied
                  </div>
                )}
              </div>

              {/* Add-ons chips */}
              {addons.length > 0 && (
                <div className="px-2.5 py-2.5 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <div className="text-[9px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 font-bold mb-1.5">
                    Add-Ons
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {addons.map((addon) => (
                      <button
                        key={addon.pricebook_item_id}
                        onClick={() =>
                          onToggleAddon(
                            tier.tier_number,
                            addon.pricebook_item_id,
                            !addon.addon_default_checked
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                          addon.addon_default_checked
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-600 dark:text-blue-400 font-bold"
                            : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        <span className="text-[10px]">
                          {addon.addon_default_checked ? "✓" : "☐"}
                        </span>
                        {addon.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
