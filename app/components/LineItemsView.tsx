import { EstimateLineItem } from "@/lib/types";

interface LineItemsViewProps {
  lineItems: EstimateLineItem[];
  totalAmount: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  taxRate: number | null;
  selectedTier: number | null;
}

const tierNames: Record<number, string> = {
  1: "Standard Comfort",
  2: "Enhanced Efficiency",
  3: "Premium Performance",
};

export default function LineItemsView({
  lineItems,
  totalAmount,
  subtotal,
  taxAmount,
  taxRate,
  selectedTier,
}: LineItemsViewProps) {
  if (lineItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Estimate Options
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No line items on this estimate.
        </p>
      </div>
    );
  }

  // Group by option_group (tiers), then separate addons
  const tiers = new Map<number, EstimateLineItem[]>();
  const addons: EstimateLineItem[] = [];

  for (const item of lineItems) {
    if (item.is_addon) {
      addons.push(item);
    } else {
      const group = tiers.get(item.option_group) || [];
      group.push(item);
      tiers.set(item.option_group, group);
    }
  }

  const sortedTierKeys = Array.from(tiers.keys()).sort((a, b) => a - b);
  const isSigned = selectedTier != null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {isSigned ? "Accepted Option" : "Estimate Options"}
        </h2>
        {totalAmount != null && (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Tier summary cards */}
      <div className="space-y-2">
        {sortedTierKeys.map((tierNum) => {
          const items = tiers.get(tierNum) || [];
          const tierTotal = items.reduce((sum, i) => sum + i.line_total, 0);
          const isSelected = tierNum === selectedTier;
          const showDetails = isSelected || (!isSigned && sortedTierKeys.length === 1);

          return (
            <div
              key={tierNum}
              className={`rounded-md border ${
                isSelected
                  ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                  : isSigned
                    ? "border-gray-100 dark:border-gray-700 opacity-40"
                    : "border-gray-200 dark:border-gray-700"
              } p-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {tierNames[tierNum] || `Tier ${tierNum}`}
                  </h3>
                  {isSelected && (
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
                      Accepted
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ${tierTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Expanded line items for selected tier (or single tier when not signed) */}
              {showDetails && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  {[...items]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between py-1"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {item.quantity > 1 && (
                              <span className="text-gray-500 dark:text-gray-400 mr-1">
                                {item.quantity}x
                              </span>
                            )}
                            {item.display_name}
                          </div>
                          {item.spec_line && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {item.spec_line}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 shrink-0">
                          ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Add-ons
            </h3>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              ${addons
                .reduce((s, i) => s + (i.is_selected ? i.line_total : 0), 0)
                .toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-1">
            {addons
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between py-1 ${
                    !item.is_selected ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      {item.quantity > 1 && (
                        <span className="text-gray-500 dark:text-gray-400 mr-1">
                          {item.quantity}x
                        </span>
                      )}
                      {item.display_name}
                      {!item.is_selected && (
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                          (declined)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 shrink-0">
                    ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Totals */}
      {subtotal != null && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          {taxAmount != null && taxAmount > 0 && (
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Tax{taxRate ? ` (${(taxRate * 100).toFixed(2)}%)` : ""}</span>
              <span>${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalAmount != null && (
            <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-gray-100">
              <span>Total</span>
              <span>${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
