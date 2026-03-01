"use client";

import type { TierForm, TierTotals, FinancingPlanFull } from "./types";
import { formatCurrency, calculateMonthly } from "./utils";

interface Props {
  tiers: TierForm[];
  tierTotals: TierTotals[];
  selectedFinancingPlan: FinancingPlanFull | null;
  includeTax: boolean;
  taxRate: number | null;
  onSend: () => void;
  saving: boolean;
  canSend: boolean;
}

export default function QuoteBuilderTotalsBar({
  tiers,
  tierTotals,
  selectedFinancingPlan,
  includeTax,
  taxRate,
  onSend,
  saving,
  canSend,
}: Props) {
  const getCashTotal = (total: number) => {
    if (includeTax && taxRate != null) {
      const tax = Math.round(total * taxRate * 100) / 100;
      return Math.round((total + tax) * 100) / 100;
    }
    return total;
  };

  const getMonthly = (total: number) => {
    if (!selectedFinancingPlan) return null;
    const cash = getCashTotal(total);
    return calculateMonthly(cash, selectedFinancingPlan.fee_pct, selectedFinancingPlan.months);
  };

  return (
    <div className="bg-[#0e2040] px-7 flex items-center gap-0 h-12 shrink-0">
      {tiers.map((tier, idx) => {
        const totals = tierTotals[idx];
        const cash = getCashTotal(totals?.total || 0);
        const monthly = getMonthly(totals?.total || 0);

        return (
          <div
            key={tier.tier_number}
            className={`flex items-center gap-3.5 pr-6 mr-6 ${
              idx < tiers.length - 1 ? "border-r border-white/10" : ""
            }`}
          >
            <div>
              <div className="text-[10px] uppercase tracking-[2px] text-white/40 mb-0.5">
                {tier.is_recommended && "⭐ "}
                {tier.tier_name}
              </div>
              <div
                className={`font-bold text-xl leading-none ${
                  tier.is_recommended ? "text-amber-400" : "text-white"
                }`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {totals?.total ? formatCurrency(cash) : "$0"}
              </div>
              <div className="text-[10px] text-white/35">
                {totals?.itemCount || 0} items
                {monthly ? ` · ${formatCurrency(monthly)}/mo` : ""}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={onSend}
        disabled={!canSend || saving}
        className="px-5 py-2 rounded-lg text-sm font-extrabold tracking-wider uppercase text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-px"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          background: "linear-gradient(135deg, #e65100, #ff6d00)",
          boxShadow: "0 4px 14px rgba(230,81,0,0.4)",
        }}
      >
        {saving ? "Creating..." : "✦ Send Proposal Link"}
      </button>
    </div>
  );
}
