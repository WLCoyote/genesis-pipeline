"use client";

import { useState } from "react";
import { MaintenancePlan, MaintenancePlanInterval } from "@/lib/types";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";

interface Props {
  initialPlans: MaintenancePlan[];
}

interface PlanForm {
  id?: string;
  name: string;
  description: string;
  interval: MaintenancePlanInterval;
  coverage_items: string[];
  monthly_price: string;
  annual_price: string;
  is_active: boolean;
}

const EMPTY_FORM: PlanForm = {
  name: "",
  description: "",
  interval: "annual",
  coverage_items: [],
  monthly_price: "",
  annual_price: "",
  is_active: true,
};

const INTERVAL_LABELS: Record<MaintenancePlanInterval, string> = {
  annual: "Annual",
  "semi-annual": "Semi-Annual",
  quarterly: "Quarterly",
};

function formatCurrency(v: number): string {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MaintenancePlanManager({ initialPlans }: Props) {
  const [plans, setPlans] = useState<MaintenancePlan[]>(initialPlans);
  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCoverageItem, setNewCoverageItem] = useState("");

  function openCreate() {
    setEditing({ ...EMPTY_FORM, coverage_items: [] });
    setError(null);
    setNewCoverageItem("");
  }

  function openEdit(plan: MaintenancePlan) {
    setEditing({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      interval: plan.interval,
      coverage_items: [...(plan.coverage_items || [])],
      monthly_price: plan.monthly_price.toString(),
      annual_price: plan.annual_price.toString(),
      is_active: plan.is_active,
    });
    setError(null);
    setNewCoverageItem("");
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: editing.name.trim(),
      description: editing.description || null,
      interval: editing.interval,
      coverage_items: editing.coverage_items,
      monthly_price: parseFloat(editing.monthly_price) || 0,
      annual_price: parseFloat(editing.annual_price) || 0,
      is_active: editing.is_active,
    };

    try {
      const url = editing.id
        ? `/api/admin/maintenance-plans/${editing.id}`
        : "/api/admin/maintenance-plans";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // Refresh list
      const listRes = await fetch("/api/admin/maintenance-plans");
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
    if (!confirm("Deactivate this plan?")) return;
    const res = await fetch(`/api/admin/maintenance-plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans(plans.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/maintenance-plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      setPlans(plans.map((p) => (p.id === id ? { ...p, is_active: true } : p)));
    }
  }

  function addCoverageItem() {
    if (!editing || !newCoverageItem.trim()) return;
    setEditing({
      ...editing,
      coverage_items: [...editing.coverage_items, newCoverageItem.trim()],
    });
    setNewCoverageItem("");
  }

  function removeCoverageItem(index: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      coverage_items: editing.coverage_items.filter((_, i) => i !== index),
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plans.filter((p) => p.is_active).length} active plan{plans.filter((p) => p.is_active).length !== 1 ? "s" : ""}
        </span>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Plan
        </Button>
      </div>

      {/* Plans table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Interval</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Monthly</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Annual</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Coverage Items</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr
                key={plan.id}
                className={`border-b border-gray-100 dark:border-gray-700/50 ${
                  !plan.is_active ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</div>
                  {plan.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.description}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                  {INTERVAL_LABELS[plan.interval]}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(plan.monthly_price)}/mo
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(plan.annual_price)}/yr
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                  {(plan.coverage_items || []).length}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      plan.is_active
                        ? "bg-ds-green-bg text-ds-green"
                        : "bg-ds-red-bg text-ds-red"
                    }`}
                  >
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => openEdit(plan)}
                    className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                  >
                    Edit
                  </Button>
                  {plan.is_active ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDeactivate(plan.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleReactivate(plan.id)}
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      Reactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No maintenance plans. Click &quot;+ Add Plan&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Maintenance Plan" : "Create Maintenance Plan"}
        maxWidth="xl"
      >
        {editing && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g., Genesis Comfort Club"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Brief plan description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Interval</label>
                  <select
                    value={editing.interval}
                    onChange={(e) => setEditing({ ...editing, interval: e.target.value as MaintenancePlanInterval })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="annual">Annual</option>
                    <option value="semi-annual">Semi-Annual</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.monthly_price}
                    onChange={(e) => setEditing({ ...editing, monthly_price: e.target.value })}
                    placeholder="29.99"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Annual Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.annual_price}
                    onChange={(e) => setEditing({ ...editing, annual_price: e.target.value })}
                    placeholder="299.99"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Coverage items */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Coverage Items ({editing.coverage_items.length})
                </label>
                {editing.coverage_items.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-100 dark:divide-gray-700 mb-2">
                    {editing.coverage_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                        <button
                          onClick={() => removeCoverageItem(i)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCoverageItem}
                    onChange={(e) => setNewCoverageItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCoverageItem())}
                    placeholder="e.g., AC tune-up, filter replacement..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <Button variant="secondary" size="sm" onClick={addCoverageItem}>
                    Add
                  </Button>
                </div>
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
                disabled={saving || !editing.name.trim()}
              >
                {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
