"use client";

import { useState } from "react";
import Link from "next/link";
import type { LaborCalculatorInputs } from "@/lib/types";

interface LaborCalculatorProps {
  initialInputs: LaborCalculatorInputs | null;
}

const DEFAULT_INPUTS: LaborCalculatorInputs = {
  annual_overhead: 0,
  num_installers: 0,
  num_service_techs: 0,
  highest_tech_wage: 0,
  tax_benefits_multiplier: 0.5,
  days_per_month: 20,
  desired_profit_pct: 25,
};

export default function LaborCalculator({ initialInputs }: LaborCalculatorProps) {
  const [inputs, setInputs] = useState<LaborCalculatorInputs>(
    initialInputs ?? DEFAULT_INPUTS
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const update = (field: keyof LaborCalculatorInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  // Calculations
  const totalTechs = inputs.num_installers + inputs.num_service_techs;
  const overheadPerHr =
    totalTechs > 0 && inputs.days_per_month > 0
      ? inputs.annual_overhead / 12 / totalTechs / inputs.days_per_month / 8
      : 0;
  const directRate =
    inputs.highest_tech_wage + inputs.highest_tech_wage * inputs.tax_benefits_multiplier;
  const fullyLoaded = directRate + overheadPerHr;
  const targetRate = fullyLoaded * (1 + inputs.desired_profit_pct / 100);

  // Quick reference rates
  const rateAt = (pct: number) => fullyLoaded * (1 + pct / 100);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/labor-calculator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
      } else {
        setStatus("Saved");
      }
    } catch {
      setStatus("Save failed — network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard/admin/pricebook"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          &larr; Back to Pricebook
        </Link>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={`text-sm ${
                status.startsWith("Error")
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {status}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Inputs"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Inputs
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Annual Overhead ($)
              </label>
              <input
                type="number"
                step="1"
                value={inputs.annual_overhead || ""}
                onChange={(e) => update("annual_overhead", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Total annual overhead from P&L"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Installers
                </label>
                <input
                  type="number"
                  value={inputs.num_installers || ""}
                  onChange={(e) => update("num_installers", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Service Techs
                </label>
                <input
                  type="number"
                  value={inputs.num_service_techs || ""}
                  onChange={(e) => update("num_service_techs", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Highest Tech Wage ($/hr)
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.highest_tech_wage || ""}
                onChange={(e) => update("highest_tech_wage", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Base hourly rate of highest-paid tech"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax & Benefits Multiplier
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.tax_benefits_multiplier || ""}
                onChange={(e) => update("tax_benefits_multiplier", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., 0.50 for 50% on top of wage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Working Days Per Month
              </label>
              <input
                type="number"
                value={inputs.days_per_month || ""}
                onChange={(e) => update("days_per_month", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., 20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Desired Profit %
              </label>
              <input
                type="number"
                step="1"
                value={inputs.desired_profit_pct || ""}
                onChange={(e) => update("desired_profit_pct", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., 25"
              />
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Calculated Rates
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Overhead Cost/Hr
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(overheadPerHr)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Tech Direct Loaded Rate
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(directRate)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Fully Loaded Labor Cost
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(fullyLoaded)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Target $/Hr ({inputs.desired_profit_pct}% profit)
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(targetRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick reference */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Reference
            </h2>
            <div className="space-y-2">
              {[20, 25, 30].map((pct) => (
                <div
                  key={pct}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    At {pct}% profit
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      pct === inputs.desired_profit_pct
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {formatCurrency(rateAt(pct))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Overhead/Hr = Annual Overhead / 12 / Total Techs / Days per Month / 8 hrs.
            Direct Loaded = Wage + (Wage x Tax & Benefits Multiplier).
            Fully Loaded = Direct + Overhead/Hr.
            Target = Fully Loaded x (1 + Profit %).
          </p>
        </div>
      </div>
    </div>
  );
}
