"use client";

import { useState } from "react";
import { FinancingPlan } from "@/lib/types";

interface Props {
  initialPlans: FinancingPlan[];
}

interface PlanForm {
  id?: string;
  plan_code: string;
  label: string;
  fee_pct: string;
  months: string;
  apr: string;
  is_default: boolean;
  is_active: boolean;
  synchrony_url: string;
  display_order: string;
}

const EMPTY_FORM: PlanForm = {
  plan_code: "",
  label: "",
  fee_pct: "",
  months: "",
  apr: "0",
  is_default: false,
  is_active: true,
  synchrony_url: "",
  display_order: "0",
};

function calcMonthly(total: number, feePct: number, months: number): number {
  if (months <= 0) return 0;
  const financed = total / (1 - feePct);
  return financed / months;
}

export default function FinancingPlanManager({ initialPlans }: Props) {
  const [plans, setPlans] = useState<FinancingPlan[]>(initialPlans);
  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing({ ...EMPTY_FORM });
    setError(null);
  }

  function openEdit(plan: FinancingPlan) {
    setEditing({
      id: plan.id,
      plan_code: plan.plan_code,
      label: plan.label,
      fee_pct: (plan.fee_pct * 100).toFixed(2),
      months: String(plan.months),
      apr: (plan.apr * 100).toFixed(2),
      is_default: plan.is_default,
      is_active: plan.is_active,
      synchrony_url: plan.synchrony_url || "",
      display_order: String(plan.display_order),
    });
    setError(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    const payload = {
      plan_code: editing.plan_code,
      label: editing.label,
      fee_pct: parseFloat(editing.fee_pct) / 100,
      months: parseInt(editing.months),
      apr: parseFloat(editing.apr) / 100,
      is_default: editing.is_default,
      is_active: editing.is_active,
      synchrony_url: editing.synchrony_url || null,
      display_order: parseInt(editing.display_order) || 0,
    };

    try {
      const url = editing.id
        ? `/api/admin/financing-plans/${editing.id}`
        : "/api/admin/financing-plans";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // Refresh list
      const listRes = await fetch("/api/admin/financing-plans");
      const listData = await listRes.json();
      setPlans(listData.plans || []);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this financing plan? It will no longer appear on proposals.")) return;

    const res = await fetch(`/api/admin/financing-plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans(plans.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/financing-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      setPlans(plans.map((p) => (p.id === id ? { ...p, is_active: true } : p)));
    }
  }

  // Preview calculation
  const sampleTotal = 10000;
  const previewFee = editing ? parseFloat(editing.fee_pct) / 100 : 0;
  const previewMonths = editing ? parseInt(editing.months) : 0;
  const previewMonthly = previewFee && previewMonths
    ? calcMonthly(sampleTotal, previewFee, previewMonths)
    : 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plans.filter((p) => p.is_active).length} active plan{plans.filter((p) => p.is_active).length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          + Add Plan
        </button>
      </div>

      {/* Plans table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Plan Code</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Label</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Dealer Fee</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Months</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">APR</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">$10K Monthly</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Default</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const monthly = calcMonthly(10000, plan.fee_pct, plan.months);
              return (
                <tr
                  key={plan.id}
                  className={`border-b border-gray-100 dark:border-gray-700/50 ${
                    !plan.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-gray-100">{plan.plan_code}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{plan.label}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {(plan.fee_pct * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{plan.months}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {(plan.apr * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                    ${monthly.toFixed(0)}/mo
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {plan.is_default && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        plan.is_active
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(plan)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-2"
                    >
                      Edit
                    </button>
                    {plan.is_active ? (
                      <button
                        onClick={() => handleDeactivate(plan.id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-xs"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(plan.id)}
                        className="text-green-600 dark:text-green-400 hover:underline text-xs"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No financing plans. Click &quot;+ Add Plan&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editing.id ? "Edit Financing Plan" : "Add Financing Plan"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan Code</label>
                  <input
                    type="text"
                    value={editing.plan_code}
                    onChange={(e) => setEditing({ ...editing, plan_code: e.target.value })}
                    placeholder="e.g., 930"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editing.display_order}
                    onChange={(e) => setEditing({ ...editing, display_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                <input
                  type="text"
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="e.g., 25 Months, 0% APR (Same-as-Cash)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dealer Fee %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.fee_pct}
                    onChange={(e) => setEditing({ ...editing, fee_pct: e.target.value })}
                    placeholder="11.60"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Term (months)</label>
                  <input
                    type="number"
                    value={editing.months}
                    onChange={(e) => setEditing({ ...editing, months: e.target.value })}
                    placeholder="25"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">APR %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.apr}
                    onChange={(e) => setEditing({ ...editing, apr: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Synchrony URL (optional)</label>
                <input
                  type="url"
                  value={editing.synchrony_url}
                  onChange={(e) => setEditing({ ...editing, synchrony_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editing.is_default}
                    onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Default plan
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Active
                </label>
              </div>

              {/* Preview */}
              {previewMonthly > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Preview ($10,000 job)</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Financed total: ${(sampleTotal / (1 - previewFee)).toFixed(2)} &middot;
                    Monthly: <strong>${previewMonthly.toFixed(2)}/mo</strong> &middot;
                    Dealer fee: ${(sampleTotal / (1 - previewFee) - sampleTotal).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.plan_code || !editing.label || !editing.fee_pct || !editing.months}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
