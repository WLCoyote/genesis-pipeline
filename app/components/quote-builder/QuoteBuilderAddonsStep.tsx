"use client";

import type { TierForm, PricebookItemSlim, MaintenancePlanSlim } from "./types";
import { formatCurrency } from "./utils";
import SectionHeader from "@/app/components/ui/SectionHeader";

interface Props {
  tiers: TierForm[];
  pricebookItems: PricebookItemSlim[];
  maintenancePlans: MaintenancePlanSlim[];
  onToggleAddon: (tierNumber: number, pbItemId: string, checked: boolean) => void;
  onAddItem: (tierNumber: number, item: PricebookItemSlim, qty?: number) => void;
  onRemoveItem: (tierNumber: number, pbItemId: string) => void;
}

export default function QuoteBuilderAddonsStep({
  tiers,
  pricebookItems,
  maintenancePlans,
  onToggleAddon,
  onAddItem,
  onRemoveItem,
}: Props) {
  // All addon-type items from pricebook
  const addonItems = pricebookItems.filter((p) => p.is_addon);

  // All addon items currently in any tier
  const allTierAddonIds = new Set<string>();
  for (const tier of tiers) {
    for (const item of tier.items) {
      if (item.is_addon) allTierAddonIds.add(item.pricebook_item_id);
    }
  }

  // Items available to add (not yet in any tier)
  const availableAddons = addonItems.filter((a) => !allTierAddonIds.has(a.id));

  return (
    <div className="max-w-4xl mx-auto">
      <SectionHeader className="mb-4">Add-Ons — Toggle per tier</SectionHeader>

      {/* Cross-tier addon matrix */}
      <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ds-border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Add-On
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                Price
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.tier_number}
                  className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32"
                >
                  {tier.tier_name}
                </th>
              ))}
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Addons currently in at least one tier */}
            {[...allTierAddonIds].map((addonId) => {
              const pbItem = pricebookItems.find((p) => p.id === addonId);
              if (!pbItem) return null;

              return (
                <tr key={addonId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ds-text">{pbItem.display_name}</div>
                    {pbItem.spec_line && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{pbItem.spec_line}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-ds-text">
                    {formatCurrency(pbItem.unit_price ?? 0)}
                  </td>
                  {tiers.map((tier) => {
                    const tierAddon = tier.items.find(
                      (i) => i.pricebook_item_id === addonId && i.is_addon
                    );
                    const isInTier = !!tierAddon;
                    const isChecked = tierAddon?.addon_default_checked ?? false;

                    return (
                      <td key={tier.tier_number} className="px-4 py-3 text-center">
                        {isInTier ? (
                          <button
                            onClick={() =>
                              onToggleAddon(tier.tier_number, addonId, !isChecked)
                            }
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                              isChecked
                                ? "bg-ds-blue border-ds-blue text-white"
                                : "bg-ds-card dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-400 hover:border-ds-blue"
                            }`}
                          >
                            {isChecked && "✓"}
                          </button>
                        ) : (
                          <button
                            onClick={() => onAddItem(tier.tier_number, pbItem)}
                            className="text-xs text-ds-blue hover:underline"
                          >
                            + Add
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        for (const tier of tiers) {
                          if (tier.items.some((i) => i.pricebook_item_id === addonId)) {
                            onRemoveItem(tier.tier_number, addonId);
                          }
                        }
                      }}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}

            {allTierAddonIds.size === 0 && (
              <tr>
                <td colSpan={2 + tiers.length + 1} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  No add-ons yet. Add them from the pricebook panel →
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Available addons to add */}
      {availableAddons.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Available Add-Ons — click to add to all tiers
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableAddons.map((addon) => (
              <button
                key={addon.id}
                onClick={() => {
                  for (const tier of tiers) {
                    onAddItem(tier.tier_number, addon);
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <span className="text-xs">+</span>
                {addon.display_name}
                <span className="text-xs text-gray-400">{formatCurrency(addon.unit_price ?? 0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Maintenance Plans */}
      {maintenancePlans.length > 0 && (
        <div className="mt-6">
          <SectionHeader className="mb-3">Maintenance Plans</SectionHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {maintenancePlans.map((plan) => {
              // Check if plan is already added (by matching plan ID in pricebook_item_id)
              const planItemId = `maint-plan-${plan.id}`;
              const isInAnyTier = tiers.some((t) =>
                t.items.some((i) => i.pricebook_item_id === planItemId)
              );

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isInAnyTier
                      ? "border-ds-green bg-ds-green-bg"
                      : "border-gray-200 dark:border-gray-600 bg-ds-card dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-ds-text">{plan.name}</div>
                      {plan.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {plan.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-ds-text">
                        {formatCurrency(plan.monthly_price)}/mo
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatCurrency(plan.annual_price)}/yr
                      </div>
                    </div>
                  </div>

                  {plan.coverage_items.length > 0 && (
                    <div className="mb-3 space-y-0.5">
                      {plan.coverage_items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <span className="text-ds-green">&#10003;</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {isInAnyTier ? (
                    <button
                      onClick={() => {
                        for (const tier of tiers) {
                          if (tier.items.some((i) => i.pricebook_item_id === planItemId)) {
                            onRemoveItem(tier.tier_number, planItemId);
                          }
                        }
                      }}
                      className="w-full text-center text-xs font-bold text-ds-red bg-ds-red-bg px-3 py-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Remove from All Tiers
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const fakePbItem: PricebookItemSlim = {
                          id: planItemId,
                          display_name: plan.name,
                          spec_line: plan.description,
                          unit_price: plan.monthly_price,
                          cost: null,
                          manufacturer: null,
                          model_number: null,
                          part_number: null,
                          category: "maintenance_plan",
                          system_type: null,
                          efficiency_rating: null,
                          is_addon: true,
                          addon_default_checked: true,
                          unit_of_measure: "mo",
                          hcp_type: null,
                          refrigerant_type: null,
                          is_favorite: false,
                        };
                        for (const tier of tiers) {
                          onAddItem(tier.tier_number, fakePbItem);
                        }
                      }}
                      className="w-full text-center text-xs font-bold text-ds-blue bg-ds-blue-bg px-3 py-1.5 rounded-md hover:bg-ds-blue hover:text-white transition-colors"
                    >
                      Add to All Tiers
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
