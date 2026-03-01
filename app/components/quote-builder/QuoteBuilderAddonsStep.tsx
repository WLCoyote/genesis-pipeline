"use client";

import type { TierForm, PricebookItemSlim } from "./types";
import { formatCurrency } from "./utils";

interface Props {
  tiers: TierForm[];
  pricebookItems: PricebookItemSlim[];
  onToggleAddon: (tierNumber: number, pbItemId: string, checked: boolean) => void;
  onAddItem: (tierNumber: number, item: PricebookItemSlim, qty?: number) => void;
  onRemoveItem: (tierNumber: number, pbItemId: string) => void;
}

export default function QuoteBuilderAddonsStep({
  tiers,
  pricebookItems,
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
      <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100 mb-4">
        Add-Ons — Toggle per tier
      </h3>

      {/* Cross-tier addon matrix */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
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
                    <div className="font-medium text-gray-900 dark:text-gray-100">{pbItem.display_name}</div>
                    {pbItem.spec_line && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{pbItem.spec_line}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
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
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-400 hover:border-blue-400"
                            }`}
                          >
                            {isChecked && "✓"}
                          </button>
                        ) : (
                          <button
                            onClick={() => onAddItem(tier.tier_number, pbItem)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
    </div>
  );
}
