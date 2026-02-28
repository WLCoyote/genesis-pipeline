"use client";

import { useState } from "react";
import Link from "next/link";
import type { MarkupTier } from "@/lib/types";

interface MarkupTiersEditorProps {
  initialTiers: MarkupTier[];
}

interface TierRow {
  tier_number: number;
  min_cost: string;
  max_cost: string;
  multiplier: string;
}

function toRows(tiers: MarkupTier[]): TierRow[] {
  return tiers.map((t) => ({
    tier_number: t.tier_number,
    min_cost: String(t.min_cost),
    max_cost: t.max_cost != null ? String(t.max_cost) : "",
    multiplier: String(t.multiplier),
  }));
}

export default function MarkupTiersEditor({ initialTiers }: MarkupTiersEditorProps) {
  const [rows, setRows] = useState<TierRow[]>(toRows(initialTiers));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const updateRow = (index: number, field: keyof TierRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    const nextNum = rows.length > 0 ? Math.max(...rows.map((r) => r.tier_number)) + 1 : 1;
    setRows((prev) => [
      ...prev,
      { tier_number: nextNum, min_cost: "", max_cost: "", multiplier: "" },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("");

    const tiers = rows.map((r) => ({
      tier_number: r.tier_number,
      min_cost: parseFloat(r.min_cost),
      max_cost: r.max_cost ? parseFloat(r.max_cost) : null,
      multiplier: parseFloat(r.multiplier),
    }));

    // Validate
    for (const t of tiers) {
      if (isNaN(t.min_cost) || isNaN(t.multiplier)) {
        setStatus("Error: All tiers need valid min cost and multiplier");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/markup-tiers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.error}`);
      } else {
        setRows(toRows(data.tiers));
        setStatus("Saved");
      }
    } catch {
      setStatus("Save failed — network error");
    } finally {
      setSaving(false);
    }
  };

  // Derived calculations
  const calcMarkupPct = (multiplier: string) => {
    const m = parseFloat(multiplier);
    if (!m || isNaN(m)) return "—";
    return `${((m - 1) * 100).toFixed(0)}%`;
  };

  const calcProfitPct = (multiplier: string) => {
    const m = parseFloat(multiplier);
    if (!m || isNaN(m) || m === 0) return "—";
    return `${((1 - 1 / m) * 100).toFixed(1)}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/pricebook"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            &larr; Back to Pricebook
          </Link>
        </div>
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
            onClick={addRow}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            + Add Tier
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Tier #
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Min Cost
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Max Cost
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Multiplier
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Markup %
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Profit %
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={row.tier_number}
                    onChange={(e) =>
                      updateRow(index, "tier_number", e.target.value)
                    }
                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={row.min_cost}
                    onChange={(e) => updateRow(index, "min_cost", e.target.value)}
                    className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={row.max_cost}
                    onChange={(e) => updateRow(index, "max_cost", e.target.value)}
                    className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
                    placeholder="No limit"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={row.multiplier}
                    onChange={(e) =>
                      updateRow(index, "multiplier", e.target.value)
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right"
                    placeholder="1.00"
                  />
                </td>
                <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                  {calcMarkupPct(row.multiplier)}
                </td>
                <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                  {calcProfitPct(row.multiplier)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => removeRow(index)}
                    className="text-red-500 dark:text-red-400 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Markup % = (multiplier - 1) x 100. Profit % = (1 - 1/multiplier) x 100. Leave Max Cost empty for the highest tier (no upper bound).
      </p>
    </div>
  );
}
