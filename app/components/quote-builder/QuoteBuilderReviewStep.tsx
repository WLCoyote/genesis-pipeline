"use client";

import type { TierForm, TierTotals, FinancingPlanFull, UserSlim } from "./types";
import { formatCurrency, calculateMonthly, groupItemsByCategory } from "./utils";

interface Props {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  tiers: TierForm[];
  tierTotals: TierTotals[];
  selectedFinancingPlan: FinancingPlanFull | null;
  includeTax: boolean;
  taxRate: number | null;
  assignedTo: string;
  users: UserSlim[];
  onSubmit: () => void;
  saving: boolean;
  canSend: boolean;
}

export default function QuoteBuilderReviewStep({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  tiers,
  tierTotals,
  selectedFinancingPlan,
  includeTax,
  taxRate,
  assignedTo,
  users,
  onSubmit,
  saving,
  canSend,
}: Props) {
  const assignedUser = users.find((u) => u.id === assignedTo);

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

  const warnings: string[] = [];
  if (!customerName.trim()) warnings.push("Customer name is required");
  if (!tiers.some((t) => t.items.length > 0)) warnings.push("At least one tier must have items");
  if (!customerEmail?.trim()) warnings.push("No customer email — they won't receive a confirmation");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
        Review & Send
      </h3>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Customer summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Customer</div>
        <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{customerName || "—"}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {[customerAddress, customerEmail, customerPhone].filter(Boolean).join(" · ") || "No contact info"}
        </div>
        {assignedUser && (
          <div className="text-xs text-gray-400 mt-1">Assigned to: {assignedUser.name}</div>
        )}
      </div>

      {/* Tier summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tiers.map((tier, idx) => {
          const totals = tierTotals[idx];
          const cash = getCashTotal(totals?.total || 0);
          const monthly = getMonthly(totals?.total || 0);
          const groups = groupItemsByCategory(tier.items);
          const addons = tier.items.filter((i) => i.is_addon && i.addon_default_checked);

          return (
            <div
              key={tier.tier_number}
              className={`bg-white dark:bg-gray-800 border rounded-xl shadow-sm overflow-hidden ${
                tier.is_recommended
                  ? "border-blue-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{tier.tier_name}</div>
                {tier.tagline && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tier.tagline}</div>
                )}
                {tier.is_recommended && (
                  <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(cash)}
                </span>
                {monthly != null && monthly > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {formatCurrency(monthly)}/mo
                  </span>
                )}
                {includeTax && taxRate != null && totals?.total > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    incl. {(taxRate * 100).toFixed(1)}% tax
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {groups.map((g) => (
                  <div key={g.slug}>
                    {g.items.map((item) => (
                      <div key={item.pricebook_item_id} className="flex justify-between">
                        <span>{item.display_name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                        <span className="text-gray-500">{formatCurrency(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {addons.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-600">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Add-Ons</div>
                    {addons.map((a) => (
                      <div key={a.pricebook_item_id} className="flex justify-between">
                        <span>{a.display_name}</span>
                        <span className="text-gray-500">{formatCurrency(a.unit_price * a.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tier.items.length === 0 && (
                  <div className="text-gray-400 italic">No items</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Financing summary */}
      {selectedFinancingPlan && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Financing</div>
          <div className="text-sm text-gray-900 dark:text-gray-100">{selectedFinancingPlan.label}</div>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!canSend || saving}
          className="px-8 py-3 rounded-xl text-sm font-extrabold tracking-wider uppercase text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-px"
          style={{
            background: "linear-gradient(135deg, #e65100, #ff6d00)",
            boxShadow: "0 4px 14px rgba(230,81,0,0.4)",
          }}
        >
          {saving ? "Creating Quote..." : "Create Quote & Send"}
        </button>
      </div>
    </div>
  );
}
