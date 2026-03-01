import { EstimateLineItem } from "@/lib/types";

interface LineItemsViewProps {
  lineItems: EstimateLineItem[];
  totalAmount: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  taxRate: number | null;
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
}: LineItemsViewProps) {
  if (lineItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Line Items
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Line Items
        </h2>
        {totalAmount != null && (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Total: ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Tiers */}
      <div className="space-y-4">
        {sortedTierKeys.map((tierNum) => {
          const items = tiers.get(tierNum) || [];
          const tierTotal = items.reduce((sum, i) => sum + i.line_total, 0);
          const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

          return (
            <div key={tierNum}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tierNames[tierNum] || `Tier ${tierNum}`}
                </h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  ${tierTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-1">
                {sorted.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.quantity > 1 && (
                          <span className="text-gray-500 dark:text-gray-400 mr-1">
                            {item.quantity}x
                          </span>
                        )}
                        {item.display_name}
                      </div>
                      {item.spec_line && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.spec_line}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 ml-3 shrink-0">
                      ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add-ons */}
        {addons.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Add-ons
              </h3>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                ${addons.reduce((s, i) => s + (i.is_selected ? i.line_total : 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-1">
              {addons
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                      !item.is_selected ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.quantity > 1 && (
                          <span className="text-gray-500 dark:text-gray-400 mr-1">
                            {item.quantity}x
                          </span>
                        )}
                        {item.display_name}
                        {!item.is_selected && (
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            not selected
                          </span>
                        )}
                      </div>
                      {item.spec_line && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.spec_line}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 ml-3 shrink-0">
                      ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      {subtotal != null && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          {taxAmount != null && taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
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
