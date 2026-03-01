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
      <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4">
        <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400 mb-3">
          Estimate Options
        </div>
        <p className="text-[13px] text-ds-gray-lt dark:text-gray-500">
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
    <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400">
          {isSigned ? "Accepted Option" : "Estimate Options"}
        </div>
        {totalAmount != null && (
          <span className={`font-display text-lg font-black ${isSigned ? "text-ds-green" : "text-ds-text dark:text-gray-100"}`}>
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

          if (isSigned && !isSelected) {
            // Collapsed non-selected tier
            return (
              <div
                key={tierNum}
                className="flex justify-between items-center py-2 opacity-40"
              >
                <span className="text-[13px] text-ds-gray dark:text-gray-400">
                  {tierNames[tierNum] || `Tier ${tierNum}`}
                </span>
                <span className="text-[13px] text-ds-gray-lt dark:text-gray-500 font-bold">
                  ${tierTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          }

          return (
            <div
              key={tierNum}
              className={`rounded-xl border-[1.5px] p-3.5 ${
                isSelected
                  ? "border-ds-green/25 bg-ds-green-bg dark:bg-green-900/20"
                  : "border-ds-border dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-ds-text dark:text-gray-100">
                    {tierNames[tierNum] || `Tier ${tierNum}`}
                  </h3>
                  {isSelected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-ds-green text-white">
                      ✓ Accepted
                    </span>
                  )}
                </div>
                <span className={`font-display text-xl font-black ${isSelected ? "text-ds-green" : "text-ds-text dark:text-gray-100"}`}>
                  ${tierTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Expanded line items */}
              {showDetails && (
                <div className="mt-2.5 pt-2.5 border-t border-ds-border/50 dark:border-gray-700/50 space-y-1">
                  {[...items]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between py-1"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-ds-text dark:text-gray-300">
                            {item.quantity > 1 && (
                              <span className="text-ds-gray dark:text-gray-400 mr-1">
                                {item.quantity}x
                              </span>
                            )}
                            {item.display_name}
                          </div>
                          {item.spec_line && (
                            <div className="text-[12px] text-ds-gray-lt dark:text-gray-500 truncate">
                              {item.spec_line}
                            </div>
                          )}
                        </div>
                        <span className="text-[12px] font-bold text-ds-text dark:text-gray-300 ml-3 shrink-0">
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
            <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400">
              Add-ons
            </div>
            <span className="text-[12px] font-bold text-ds-text-lt dark:text-gray-400">
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
                    <div className="text-[12px] text-ds-text dark:text-gray-300">
                      {item.quantity > 1 && (
                        <span className="text-ds-gray dark:text-gray-400 mr-1">
                          {item.quantity}x
                        </span>
                      )}
                      {item.display_name}
                      {!item.is_selected && (
                        <span className="ml-1.5 text-[11px] text-ds-gray-lt dark:text-gray-500">
                          (declined)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-ds-text-lt dark:text-gray-400 ml-3 shrink-0">
                    ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Totals */}
      {subtotal != null && (
        <div className="mt-3 pt-3 border-t-[1.5px] border-ds-border dark:border-gray-700 space-y-1">
          <div className="flex justify-between text-[12px] text-ds-text-lt dark:text-gray-400">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          {taxAmount != null && taxAmount > 0 && (
            <div className="flex justify-between text-[12px] text-ds-text-lt dark:text-gray-400">
              <span>Tax{taxRate ? ` (${(taxRate * 100).toFixed(2)}%)` : ""}</span>
              <span>${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalAmount != null && (
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[13px] font-bold text-ds-text dark:text-gray-100">Total</span>
              <span className="font-display text-2xl font-black text-ds-text dark:text-gray-100">
                ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
