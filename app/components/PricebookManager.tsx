"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PricebookItem, PricebookCategory, MarkupTier } from "@/lib/types";

interface PricebookManagerProps {
  initialItems: PricebookItem[];
}

const CATEGORIES: { value: PricebookCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "equipment", label: "Equipment" },
  { value: "labor", label: "Labor" },
  { value: "material", label: "Material" },
  { value: "addon", label: "Add-On" },
  { value: "service_plan", label: "Service Plan" },
];

const CATEGORY_OPTIONS: { value: PricebookCategory; label: string }[] = [
  { value: "equipment", label: "Equipment" },
  { value: "labor", label: "Labor" },
  { value: "material", label: "Material" },
  { value: "addon", label: "Add-On" },
  { value: "service_plan", label: "Service Plan" },
];

const EMPTY_FORM = {
  display_name: "",
  category: "equipment" as PricebookCategory,
  spec_line: "",
  description: "",
  unit_price: "",
  cost: "",
  unit_of_measure: "",
  manufacturer: "",
  model_number: "",
  part_number: "",
  is_addon: false,
  addon_default_checked: false,
  is_commissionable: true,
  rebate_amount: "",
  taxable: true,
  is_active: true,
  push_to_hcp: false,
};

// Categories that support markup auto-suggest (not labor or service_plan)
const MARKUP_CATEGORIES: PricebookCategory[] = ["equipment", "material", "addon"];

export default function PricebookManager({ initialItems }: PricebookManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [categoryFilter, setCategoryFilter] = useState<PricebookCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Markup tiers for auto-suggest
  const [markupTiers, setMarkupTiers] = useState<MarkupTier[]>([]);

  useEffect(() => {
    fetch("/api/admin/markup-tiers")
      .then((res) => res.json())
      .then((data) => {
        if (data.tiers) setMarkupTiers(data.tiers);
      })
      .catch(() => {});
  }, []);

  // Find the matching tier for a given cost
  const findTier = useCallback(
    (cost: number): MarkupTier | null => {
      if (cost <= 0 || markupTiers.length === 0) return null;
      return (
        markupTiers.find(
          (t) => cost >= t.min_cost && (t.max_cost === null || cost <= t.max_cost)
        ) ?? null
      );
    },
    [markupTiers]
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  // Filter items
  const filtered = useMemo(() => {
    let result = items;

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (!showInactive) {
      result = result.filter((i) => i.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.display_name.toLowerCase().includes(q) ||
          (i.spec_line && i.spec_line.toLowerCase().includes(q)) ||
          (i.manufacturer && i.manufacturer.toLowerCase().includes(q)) ||
          (i.part_number && i.part_number.toLowerCase().includes(q))
      );
    }

    return result;
  }, [items, categoryFilter, searchQuery, showInactive]);

  // Margin calculation
  const calcMargin = (price: number | null, cost: number | null) => {
    if (!price || !cost || price === 0) return null;
    return ((price - cost) / price) * 100;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "—";
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  // HCP badge
  const hcpBadge = (item: PricebookItem) => {
    if (item.hcp_type === "material") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          HCP Material
        </span>
      );
    }
    if (item.hcp_type === "service") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
          HCP Service
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        Pipeline only
      </span>
    );
  };

  // Import from HCP
  const handleImport = async () => {
    setImporting(true);
    setImportResult("");
    try {
      const res = await fetch("/api/admin/pricebook/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setImportResult(`Error: ${data.error}`);
      } else {
        const skipped = (data.materials_skipped || 0) + (data.services_skipped || 0);
        setImportResult(
          `Imported ${data.materials_imported} materials, ${data.services_imported} services` +
          (skipped > 0 ? ` (${skipped} already in Pipeline, skipped)` : "")
        );
        router.refresh();
      }
    } catch {
      setImportResult("Import failed — network error");
    } finally {
      setImporting(false);
    }
  };

  // Open modal for create
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSyncStatus("");
    setModalOpen(true);
  };

  // Open modal for edit
  const openEdit = (item: PricebookItem) => {
    setForm({
      display_name: item.display_name,
      category: item.category,
      spec_line: item.spec_line || "",
      description: item.description || "",
      unit_price: item.unit_price != null ? String(item.unit_price) : "",
      cost: item.cost != null ? String(item.cost) : "",
      unit_of_measure: item.unit_of_measure || "",
      manufacturer: item.manufacturer || "",
      model_number: item.model_number || "",
      part_number: item.part_number || "",
      is_addon: item.is_addon,
      addon_default_checked: item.addon_default_checked,
      is_commissionable: item.is_commissionable,
      rebate_amount: item.rebate_amount != null ? String(item.rebate_amount) : "",
      taxable: item.taxable,
      is_active: item.is_active,
      push_to_hcp: false,
    });
    setEditingId(item.id);
    setError("");
    setSyncStatus("");
    setModalOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.display_name.trim()) {
      setError("Display name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSyncStatus("");

    const payload = {
      ...form,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      rebate_amount: form.rebate_amount ? parseFloat(form.rebate_amount) : null,
    };

    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/admin/pricebook/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/pricebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
      } else {
        if (data.hcp_sync) {
          const labels: Record<string, string> = {
            updated: "Synced to HCP",
            created_in_hcp: "Created in HCP",
            skipped_service_readonly: "HCP service (read-only, not synced)",
            sync_failed: "HCP sync failed (Pipeline saved OK)",
          };
          setSyncStatus(labels[data.hcp_sync] || data.hcp_sync);
        }

        // Update local state
        if (editingId) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingId ? data.item : i))
          );
        } else {
          setItems((prev) => [...prev, data.item]);
        }

        setModalOpen(false);
        router.refresh();
      }
    } catch {
      setError("Save failed — network error");
    } finally {
      setSaving(false);
    }
  };

  // Deactivate
  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pricebook/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, is_active: false } : i))
        );
        router.refresh();
      }
    } catch {
      // Silently fail — user can retry
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import from HCP"}
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Item
          </button>
          <Link
            href="/dashboard/admin/pricebook/markup-tiers"
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Markup Tiers
          </Link>
          <Link
            href="/dashboard/admin/pricebook/labor-calculator"
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Labor Calculator
          </Link>

          {importResult && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {importResult}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category pills */}
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                categoryFilter === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-48"
          />

          {/* Show inactive toggle */}
          <label className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Items table — desktop */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          No pricebook items found.
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Price
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Cost
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Margin
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const margin = calcMargin(item.unit_price, item.cost);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {item.display_name}
                        </div>
                        {item.spec_line && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {item.spec_line}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-600 dark:text-gray-400">
                          {item.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {margin != null ? (
                          <span
                            className={
                              margin >= 20
                                ? "text-green-600 dark:text-green-400"
                                : margin >= 0
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {margin.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{hcpBadge(item)}</td>
                      <td className="px-4 py-3">
                        {item.is_active ? (
                          <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            Edit
                          </button>
                          {item.is_active && (
                            <button
                              onClick={() => handleDeactivate(item.id)}
                              className="text-red-500 dark:text-red-400 hover:underline text-sm"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => {
              const margin = calcMargin(item.unit_price, item.cost);
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.display_name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                        {item.category.replace("_", " ")}
                      </div>
                    </div>
                    {hcpBadge(item)}
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.unit_price)}
                    </span>
                    {margin != null && (
                      <span
                        className={
                          margin >= 20
                            ? "text-green-600 dark:text-green-400"
                            : margin >= 0
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {margin.toFixed(1)}% margin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                    >
                      Edit
                    </button>
                    {item.is_active && (
                      <button
                        onClick={() => handleDeactivate(item.id)}
                        className="text-red-500 dark:text-red-400 text-sm hover:underline"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingId ? "Edit Item" : "Add Pricebook Item"}
              </h2>

              {error && (
                <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded">
                  {error}
                </div>
              )}

              {syncStatus && (
                <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm rounded">
                  {syncStatus}
                </div>
              )}

              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) =>
                      setForm({ ...form, display_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Mitsubishi Hyper Heat — Premium System"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as PricebookCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Spec Line */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Spec Line
                  </label>
                  <input
                    type="text"
                    value={form.spec_line}
                    onChange={(e) =>
                      setForm({ ...form, spec_line: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., 3 Ton SVZ | Hyper Heat | -13°F Rated"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Customer-facing value statement"
                  />
                </div>

                {/* Price + Cost row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.unit_price}
                      onChange={(e) =>
                        setForm({ ...form, unit_price: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => {
                        const newCost = e.target.value;
                        const updates: Partial<typeof form> = { cost: newCost };
                        // Auto-suggest price for markup-eligible categories
                        if (
                          MARKUP_CATEGORIES.includes(form.category) &&
                          newCost &&
                          !form.unit_price
                        ) {
                          const costNum = parseFloat(newCost);
                          const tier = findTier(costNum);
                          if (tier) {
                            updates.unit_price = (costNum * tier.multiplier).toFixed(2);
                          }
                        }
                        setForm({ ...form, ...updates });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {/* Markup suggestion hint */}
                {MARKUP_CATEGORIES.includes(form.category) &&
                  form.cost &&
                  (() => {
                    const costNum = parseFloat(form.cost);
                    const tier = findTier(costNum);
                    if (!tier || isNaN(costNum)) return null;
                    const suggested = (costNum * tier.multiplier).toFixed(2);
                    return (
                      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                        Suggested: ${suggested} (Tier {tier.tier_number} — {tier.multiplier}x markup)
                        {form.unit_price !== suggested && form.unit_price && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, unit_price: suggested })}
                            className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Apply
                          </button>
                        )}
                      </p>
                    );
                  })()}

                {/* Manufacturer + Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={form.manufacturer}
                      onChange={(e) =>
                        setForm({ ...form, manufacturer: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Model Number
                    </label>
                    <input
                      type="text"
                      value={form.model_number}
                      onChange={(e) =>
                        setForm({ ...form, model_number: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Part Number + UOM */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={form.part_number}
                      onChange={(e) =>
                        setForm({ ...form, part_number: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={form.unit_of_measure}
                      onChange={(e) =>
                        setForm({ ...form, unit_of_measure: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., each, ft, hr"
                    />
                  </div>
                </div>

                {/* Rebate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rebate Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.rebate_amount}
                    onChange={(e) =>
                      setForm({ ...form, rebate_amount: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.taxable}
                      onChange={(e) =>
                        setForm({ ...form, taxable: e.target.checked })
                      }
                      className="rounded"
                    />
                    Taxable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_commissionable}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_commissionable: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    Commissionable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_addon}
                      onChange={(e) =>
                        setForm({ ...form, is_addon: e.target.checked })
                      }
                      className="rounded"
                    />
                    Add-on (checkbox on proposal)
                  </label>
                  {form.is_addon && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={form.addon_default_checked}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            addon_default_checked: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      Pre-checked by default
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                      className="rounded"
                    />
                    Active
                  </label>

                  {/* Push to HCP checkbox — only for Pipeline-only items being edited */}
                  {editingId && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.push_to_hcp}
                        onChange={(e) =>
                          setForm({ ...form, push_to_hcp: e.target.checked })
                        }
                        className="rounded"
                      />
                      Push to HCP (creates material in Housecall Pro)
                    </label>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
