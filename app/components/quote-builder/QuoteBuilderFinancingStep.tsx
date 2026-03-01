"use client";

import type { FinancingPlanFull, TierForm, TierTotals } from "./types";
import { formatCurrency, calculateMonthly } from "./utils";

interface Props {
  financingPlans: FinancingPlanFull[];
  selectedFinancingPlanId: string | null;
  onSelectPlan: (planId: string | null) => void;
  includeTax: boolean;
  taxRate: number | null;
  taxLoading: boolean;
  taxError: string | null;
  customerAddress: string;
  onToggleTax: (on: boolean) => void;
  onLookupTax: (address: string) => void;
  tiers: TierForm[];
  tierTotals: TierTotals[];
}

export default function QuoteBuilderFinancingStep({
  financingPlans,
  selectedFinancingPlanId,
  onSelectPlan,
  includeTax,
  taxRate,
  taxLoading,
  taxError,
  customerAddress,
  onToggleTax,
  onLookupTax,
  tiers,
  tierTotals,
}: Props) {
  const selectedPlan = financingPlans.find((p) => p.id === selectedFinancingPlanId) || null;

  const getCashTotal = (total: number) => {
    if (includeTax && taxRate != null) {
      const tax = Math.round(total * taxRate * 100) / 100;
      return Math.round((total + tax) * 100) / 100;
    }
    return total;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tax Toggle */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
            Sales Tax
          </h3>
        </div>
        <div className="p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTax}
              onChange={(e) => onToggleTax(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Include sales tax in pricing
            </span>
          </label>

          {includeTax && (
            <div className="mt-3 ml-7">
              {taxLoading && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Looking up tax rate...</p>
              )}
              {taxRate !== null && (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Rate: {(taxRate * 100).toFixed(2)}%
                  </p>
                  <button
                    onClick={() => onLookupTax(customerAddress)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Re-lookup
                  </button>
                </div>
              )}
              {taxError && (
                <p className="text-xs text-red-500">{taxError}</p>
              )}
              {!customerAddress.trim() && taxRate === null && !taxLoading && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Enter customer address in Step 1 to look up tax rate
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financing Plans */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
            Financing Plans
          </h3>
          {selectedFinancingPlanId && (
            <button
              onClick={() => onSelectPlan(null)}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear Selection
            </button>
          )}
        </div>
        <div className="p-5">
          {financingPlans.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No financing plans available. Add them in Settings.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {financingPlans.map((plan) => {
                const isSelected = selectedFinancingPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => onSelectPlan(isSelected ? null : plan.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                  >
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {plan.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {plan.months} months · {plan.apr === 0 ? "0%" : `${(plan.apr * 100).toFixed(2)}%`} APR
                    </div>
                    {plan.is_default && (
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <a
            href="https://www.mysynchrony.com/mmc/HY223500700"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Get Pre-Approved with Synchrony →
          </a>
        </div>
      </div>

      {/* Per-tier monthly preview */}
      {selectedPlan && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-black uppercase tracking-[2px] text-gray-900 dark:text-gray-100">
              Monthly Payment Preview — {selectedPlan.label}
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {tiers.map((tier, idx) => {
                const total = tierTotals[idx]?.total || 0;
                const cash = getCashTotal(total);
                const monthly = total > 0
                  ? calculateMonthly(cash, selectedPlan.fee_pct, selectedPlan.months)
                  : 0;

                return (
                  <div key={tier.tier_number} className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                      {tier.tier_name}
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {monthly > 0 ? `${formatCurrency(monthly)}/mo` : "—"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Cash: {formatCurrency(cash)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
