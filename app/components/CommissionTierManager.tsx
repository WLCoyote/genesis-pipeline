"use client";

import { useState } from "react";
import { CommissionTier, CommissionPeriod } from "@/lib/types";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";

interface Props {
  initialTiers: CommissionTier[];
}

interface TierForm {
  id?: string;
  period: CommissionPeriod;
  min_revenue: string;
  max_revenue: string;
  rate_pct: string;
  is_active: boolean;
}

const EMPTY_FORM: TierForm = {
  period: "monthly",
  min_revenue: "",
  max_revenue: "",
  rate_pct: "",
  is_active: true,
};

function fmtMoney(n: number | null): string {
  if (n == null) return "No cap";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CommissionTierManager({ initialTiers }: Props) {
  const [tiers, setTiers] = useState<CommissionTier[]>(initialTiers);
  const [editing, setEditing] = useState<TierForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing({ ...EMPTY_FORM });
    setError(null);
  }

  function openEdit(tier: CommissionTier) {
    setEditing({
      id: tier.id,
      period: tier.period,
      min_revenue: String(tier.min_revenue),
      max_revenue: tier.max_revenue != null ? String(tier.max_revenue) : "",
      rate_pct: String(tier.rate_pct),
      is_active: tier.is_active,
    });
    setError(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    const payload = {
      period: editing.period,
      min_revenue: parseFloat(editing.min_revenue),
      max_revenue: editing.max_revenue ? parseFloat(editing.max_revenue) : null,
      rate_pct: parseFloat(editing.rate_pct),
      is_active: editing.is_active,
    };

    try {
      const url = editing.id
        ? `/api/admin/commission-tiers/${editing.id}`
        : "/api/admin/commission-tiers";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // Refresh list
      const listRes = await fetch("/api/admin/commission-tiers");
      const listData = await listRes.json();
      setTiers(listData.tiers || []);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this commission tier?")) return;

    const res = await fetch(`/api/admin/commission-tiers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTiers(tiers.map((t) => (t.id === id ? { ...t, is_active: false } : t)));
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/commission-tiers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      setTiers(tiers.map((t) => (t.id === id ? { ...t, is_active: true } : t)));
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {tiers.filter((t) => t.is_active).length} active tier{tiers.filter((t) => t.is_active).length !== 1 ? "s" : ""}
        </span>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Tier
        </Button>
      </div>

      {/* Tiers table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Period</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Min Revenue</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Max Revenue</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Rate %</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr
                key={tier.id}
                className={`border-b border-gray-100 dark:border-gray-700/50 ${
                  !tier.is_active ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 capitalize">{tier.period}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                  {fmtMoney(tier.min_revenue)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                  {fmtMoney(tier.max_revenue)}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                  {tier.rate_pct}%
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      tier.is_active
                        ? "bg-ds-green-bg text-ds-green"
                        : "bg-ds-red-bg text-ds-red"
                    }`}
                  >
                    {tier.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => openEdit(tier)}
                    className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                  >
                    Edit
                  </Button>
                  {tier.is_active ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDeactivate(tier.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleReactivate(tier.id)}
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      Reactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {tiers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No commission tiers. Click &quot;+ Add Tier&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit Commission Tier" : "Add Commission Tier"}>
        {editing && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Period</label>
                <select
                  value={editing.period}
                  onChange={(e) => setEditing({ ...editing, period: e.target.value as CommissionPeriod })}
                  className={inputCls}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min Revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.min_revenue}
                    onChange={(e) => setEditing({ ...editing, min_revenue: e.target.value })}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Max Revenue ($)
                    <span className="text-gray-400 ml-1">blank = no cap</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.max_revenue}
                    onChange={(e) => setEditing({ ...editing, max_revenue: e.target.value })}
                    placeholder="No cap"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editing.rate_pct}
                  onChange={(e) => setEditing({ ...editing, rate_pct: e.target.value })}
                  placeholder="5.00"
                  className={`${inputCls} w-32`}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Active
              </label>

              {/* Preview */}
              {editing.rate_pct && editing.min_revenue && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Preview</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    A $10,000 job at this tier pays{" "}
                    <strong>${(10000 * parseFloat(editing.rate_pct) / 100).toFixed(2)}</strong> commission
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setEditing(null)}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={saving || !editing.min_revenue || !editing.rate_pct}
              >
                {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Tier"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
