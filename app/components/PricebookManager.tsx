"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PricebookItem, PricebookCategory, PricebookCategoryRow, PricebookSupplier, MarkupTier } from "@/lib/types";

import PricebookStats from "./pricebook/PricebookStats";
import PricebookMarginAlert from "./pricebook/PricebookMarginAlert";
import PricebookToolbar from "./pricebook/PricebookToolbar";
import type { SourceFilter, MarginFilter } from "./pricebook/PricebookToolbar";
import PricebookCategoryTabs from "./pricebook/PricebookCategoryTabs";
import PricebookTable from "./pricebook/PricebookTable";
import PricebookItemModal, { EMPTY_FORM, itemToForm } from "./pricebook/PricebookItemModal";
import type { ItemFormState } from "./pricebook/PricebookItemModal";
import PricebookBulkEditModal, { EMPTY_BULK_EDIT } from "./pricebook/PricebookBulkEditModal";
import type { BulkEditFormState } from "./pricebook/PricebookBulkEditModal";

interface PricebookManagerProps {
  initialItems: PricebookItem[];
  initialCategories: PricebookCategoryRow[];
  initialSuppliers: PricebookSupplier[];
}

export default function PricebookManager({ initialItems, initialCategories, initialSuppliers }: PricebookManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(initialCategories);
  const [suppliers, setSuppliers] = useState(initialSuppliers);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<PricebookCategory | "all">("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [systemTypeFilter, setSystemTypeFilter] = useState<string>("all");
  const [efficiencyFilter, setEfficiencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [marginFilter, setMarginFilter] = useState<MarginFilter>("all");

  // Markup tiers
  const markupCategories = useMemo(
    () => categories.filter((c) => c.hcp_type === "material").map((c) => c.slug),
    [categories]
  );
  const [markupTiers, setMarkupTiers] = useState<MarkupTier[]>([]);
  useEffect(() => {
    fetch("/api/admin/markup-tiers")
      .then((res) => res.json())
      .then((data) => { if (data.tiers) setMarkupTiers(data.tiers); })
      .catch(() => {});
  }, []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  // Selection + bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<PricebookCategory>("equipment");
  const [bulkPricePercent, setBulkPricePercent] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<BulkEditFormState>(EMPTY_BULK_EDIT);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);

  // Category + supplier modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatHcpType, setNewCatHcpType] = useState<"material" | "service">("material");
  const [catSaving, setCatSaving] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierSaving, setSupplierSaving] = useState(false);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  // Equipment drill-down
  const isEquipmentFilter = categoryFilter === "equipment";

  const subcategories = useMemo(() => {
    if (categoryFilter === "all" || isEquipmentFilter) return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === categoryFilter && item.hcp_category_name) names.add(item.hcp_category_name);
    }
    return Array.from(names).sort();
  }, [items, categoryFilter, isEquipmentFilter]);

  const manufacturers = useMemo(() => {
    if (!isEquipmentFilter) return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === "equipment" && item.manufacturer) names.add(item.manufacturer);
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter]);

  const systemTypes = useMemo(() => {
    if (!isEquipmentFilter || manufacturerFilter === "all") return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === "equipment" && item.manufacturer === manufacturerFilter && item.system_type) names.add(item.system_type);
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter, manufacturerFilter]);

  const efficiencyRatings = useMemo(() => {
    if (!isEquipmentFilter || manufacturerFilter === "all" || systemTypeFilter === "all") return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === "equipment" && item.manufacturer === manufacturerFilter && item.system_type === systemTypeFilter && item.efficiency_rating)
        names.add(item.efficiency_rating);
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter, manufacturerFilter, systemTypeFilter]);

  // Filtered items
  const filtered = useMemo(() => {
    let result = items;
    if (categoryFilter !== "all") result = result.filter((i) => i.category === categoryFilter);
    if (subcategoryFilter !== "all") result = result.filter((i) => i.hcp_category_name === subcategoryFilter);
    if (manufacturerFilter !== "all") result = result.filter((i) => i.manufacturer === manufacturerFilter);
    if (systemTypeFilter !== "all") result = result.filter((i) => i.system_type === systemTypeFilter);
    if (efficiencyFilter !== "all") result = result.filter((i) => i.efficiency_rating === efficiencyFilter);
    if (!showInactive) result = result.filter((i) => i.is_active);

    // Source filter
    if (sourceFilter === "hcp_material") result = result.filter((i) => i.hcp_type === "material");
    else if (sourceFilter === "hcp_service") result = result.filter((i) => i.hcp_type === "service");
    else if (sourceFilter === "manual") result = result.filter((i) => !i.hcp_type);

    // Margin filter
    if (marginFilter !== "all") {
      result = result.filter((i) => {
        if (!i.unit_price || !i.cost || i.unit_price === 0) return marginFilter === "negative" ? false : false;
        const m = ((i.unit_price - i.cost) / i.unit_price) * 100;
        if (marginFilter === "negative") return m < 0;
        if (marginFilter === "under20") return m >= 0 && m < 20;
        if (marginFilter === "20to40") return m >= 20 && m < 40;
        if (marginFilter === "over40") return m >= 40;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.display_name.toLowerCase().includes(q) ||
          (i.spec_line && i.spec_line.toLowerCase().includes(q)) ||
          (i.manufacturer && i.manufacturer.toLowerCase().includes(q)) ||
          (i.part_number && i.part_number.toLowerCase().includes(q)) ||
          (i.refrigerant_type && i.refrigerant_type.toLowerCase().includes(q)) ||
          (i.system_type && i.system_type.toLowerCase().includes(q)) ||
          (i.efficiency_rating && i.efficiency_rating.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q)) ||
          (i.unit_of_measure && i.unit_of_measure.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, categoryFilter, subcategoryFilter, manufacturerFilter, systemTypeFilter, efficiencyFilter, searchQuery, showInactive, sourceFilter, marginFilter]);

  // Negative margin count (for alert)
  const negativeMarginCount = useMemo(
    () => items.filter((i) => i.is_active && i.unit_price && i.cost && i.unit_price > 0 && i.cost > i.unit_price).length,
    [items]
  );

  // Filter key for pagination reset
  const filterKey = `${categoryFilter}-${subcategoryFilter}-${manufacturerFilter}-${systemTypeFilter}-${efficiencyFilter}-${searchQuery}-${showInactive}-${sourceFilter}-${marginFilter}`;

  // ——— Handlers ———

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

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSyncStatus("");
    setModalOpen(true);
  };

  const openEdit = (item: PricebookItem) => {
    setForm(itemToForm(item));
    setEditingId(item.id);
    setError("");
    setSyncStatus("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError("Display name is required"); return; }
    setSaving(true); setError(""); setSyncStatus("");
    const payload = {
      ...form,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      rebate_amount: form.rebate_amount ? parseFloat(form.rebate_amount) : null,
      hcp_category_name: form.hcp_category_name.trim() || null,
      system_type: form.system_type.trim() || null,
      efficiency_rating: form.efficiency_rating.trim() || null,
      refrigerant_type: form.refrigerant_type || null,
      supplier_id: form.supplier_id || null,
      manual_price: form.manual_price,
    };
    try {
      const res = editingId
        ? await fetch(`/api/admin/pricebook/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/admin/pricebook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
      } else {
        if (data.hcp_sync) {
          const labels: Record<string, string> = {
            updated: "Synced to HCP", created_in_hcp: "Created in HCP",
            skipped_service_readonly: "HCP service (read-only, not synced)",
            sync_failed: "HCP sync failed (Pipeline saved OK)",
          };
          setSyncStatus(labels[data.hcp_sync] || data.hcp_sync);
        }
        if (editingId) {
          setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
        } else {
          setItems((prev) => [...prev, data.item]);
        }
        setModalOpen(false);
        router.refresh();
      }
    } catch { setError("Save failed — network error"); }
    finally { setSaving(false); }
  };

  const handleToggleFavorite = async (id: string, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/pricebook/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_favorite: !currentValue }) });
      if (res.ok) setItems((prev) => prev.map((item) => item.id === id ? { ...item, is_favorite: !currentValue } : item));
    } catch {}
  };

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pricebook/${id}`, { method: "DELETE" });
      if (res.ok) { setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: false } : i))); router.refresh(); }
    } catch {}
  };

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pricebook/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: true }) });
      if (res.ok) { setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: true } : i))); router.refresh(); }
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((i) => i.id)));
  };

  const clearSelection = () => { setSelectedIds(new Set()); setBulkResult(""); };

  const handleBulkCategoryChange = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true); setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds), action: "category", category: bulkCategory }) });
      const data = await res.json();
      if (!res.ok) { setBulkResult(`Error: ${data.error}`); }
      else {
        const catLabel = categories.find((c) => c.slug === bulkCategory)?.name || bulkCategory;
        setBulkResult(`Updated ${data.updated} items to ${catLabel}`);
        setItems((prev) => prev.map((i) => (selectedIds.has(i.id) ? { ...i, category: bulkCategory } : i)));
        clearSelection(); router.refresh();
      }
    } catch { setBulkResult("Bulk update failed — network error"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true); setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds), action: activate ? "activate" : "deactivate" }) });
      const data = await res.json();
      if (!res.ok) { setBulkResult(`Error: ${data.error}`); }
      else {
        setBulkResult(`${activate ? "Activated" : "Deactivated"} ${data.updated} items`);
        setItems((prev) => prev.map((i) => (selectedIds.has(i.id) ? { ...i, is_active: activate } : i)));
        clearSelection(); router.refresh();
      }
    } catch { setBulkResult("Bulk update failed — network error"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkPriceAdjust = async () => {
    const pct = parseFloat(bulkPricePercent);
    if (isNaN(pct) || pct === 0 || selectedIds.size === 0) return;
    setBulkLoading(true); setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds), action: "price_adjust", percent: pct }) });
      const data = await res.json();
      if (!res.ok) { setBulkResult(`Error: ${data.error}`); }
      else {
        setBulkResult(`Adjusted prices by ${pct > 0 ? "+" : ""}${pct}% on ${data.updated} items`);
        clearSelection(); setBulkPricePercent("");
        router.refresh();
        const itemsRes = await fetch("/api/admin/pricebook?active=");
        const itemsData = await itemsRes.json();
        if (itemsData.items) setItems(itemsData.items);
      }
    } catch { setBulkResult("Price adjust failed — network error"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkHcpSync = async () => {
    const syncableIds = Array.from(selectedIds).filter((id) => {
      const item = items.find((i) => i.id === id);
      return item && item.is_active && item.hcp_uuid && item.hcp_type === "material";
    });
    if (syncableIds.length === 0) { setBulkResult("No active HCP materials selected to sync"); return; }
    setBulkLoading(true); setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: syncableIds }) });
      const data = await res.json();
      if (!res.ok) { setBulkResult(`Error: ${data.error}`); }
      else {
        const parts = [`Synced: ${data.synced}`];
        if (data.skipped > 0) parts.push(`Skipped: ${data.skipped}`);
        if (data.failed > 0) parts.push(`Failed: ${data.failed}`);
        setBulkResult(parts.join(" | "));
        clearSelection();
      }
    } catch { setBulkResult("HCP sync failed — network error"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.size === 0) return;
    setBulkEditSaving(true); setBulkResult("");
    const fields: Record<string, unknown> = {};
    const textFields = ["category", "manufacturer", "model_number", "system_type", "efficiency_rating", "refrigerant_type", "description", "hcp_category_name", "part_number", "unit_of_measure", "spec_line"] as const;
    for (const key of textFields) { if (bulkEditForm[key]) fields[key] = bulkEditForm[key]; }
    if (bulkEditForm.supplier_id) fields.supplier_id = bulkEditForm.supplier_id;
    if (bulkEditForm.rebate_amount) fields.rebate_amount = parseFloat(bulkEditForm.rebate_amount);
    const boolFields = ["taxable", "is_commissionable", "is_addon", "addon_default_checked", "is_active"] as const;
    for (const key of boolFields) {
      if (bulkEditForm[key] === "true") fields[key] = true;
      else if (bulkEditForm[key] === "false") fields[key] = false;
    }
    if (Object.keys(fields).length === 0) { setBulkResult("No fields to update — fill in at least one field"); setBulkEditSaving(false); return; }
    try {
      const res = await fetch("/api/admin/pricebook/bulk", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds), action: "edit", fields }) });
      const data = await res.json();
      if (!res.ok) { setBulkResult(`Error: ${data.error}`); }
      else {
        setBulkResult(`Updated ${data.updated} items`);
        if (data.items) {
          const updatedMap = new Map<string, PricebookItem>(data.items.map((i: PricebookItem) => [i.id, i]));
          setItems((prev) => prev.map((i) => updatedMap.get(i.id) ?? i));
        }
        setBulkEditOpen(false); clearSelection(); router.refresh();
      }
    } catch { setBulkResult("Bulk edit failed — network error"); }
    finally { setBulkEditSaving(false); }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch("/api/admin/pricebook/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName.trim(), hcp_type: newCatHcpType }) });
      const data = await res.json();
      if (res.ok && data.category) { setCategories((prev) => [...prev, data.category]); setNewCatName(""); setCatModalOpen(false); }
    } catch {}
    finally { setCatSaving(false); }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setSupplierSaving(true);
    try {
      const res = await fetch("/api/admin/pricebook/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newSupplierName.trim() }) });
      const data = await res.json();
      if (res.ok && data.supplier) {
        setSuppliers((prev) => [...prev, data.supplier].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((prev) => ({ ...prev, supplier_id: data.supplier.id }));
        setNewSupplierName(""); setSupplierModalOpen(false);
      }
    } catch {}
    finally { setSupplierSaving(false); }
  };

  const handleCategoryChange = useCallback((cat: PricebookCategory | "all") => {
    setCategoryFilter(cat);
    setSubcategoryFilter("all");
    setManufacturerFilter("all");
    setSystemTypeFilter("all");
    setEfficiencyFilter("all");
  }, []);

  // ——— Render ———

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-black text-ds-text dark:text-gray-100 tracking-tight">
            Pricebook
          </h1>
          <p className="text-sm text-ds-gray dark:text-gray-400 mt-0.5 font-body">
            Manage equipment, labor, materials, and add-ons. Synced with Housecall Pro.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-ds-blue text-white hover:bg-blue-700 transition-colors"
          >
            + Add Item
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-card dark:bg-gray-700 text-ds-text-lt dark:text-gray-300 border border-ds-border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : "Import from HCP"}
          </button>
          <Link
            href="/dashboard/admin/pricebook/markup-tiers"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-card dark:bg-gray-700 text-ds-text-lt dark:text-gray-300 border border-ds-border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            Markup Tiers
          </Link>
          <Link
            href="/dashboard/admin/pricebook/labor-calculator"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-card dark:bg-gray-700 text-ds-text-lt dark:text-gray-300 border border-ds-border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            Labor Calculator
          </Link>
          {importResult && (
            <span className="text-sm text-ds-gray dark:text-gray-400">{importResult}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <PricebookStats items={items} />

      {/* Margin alert */}
      <PricebookMarginAlert
        negativeCount={negativeMarginCount}
        onShowProblemItems={() => setMarginFilter("negative")}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-40 mb-4 p-3 bg-ds-blue-bg dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ds-blue dark:text-blue-300">
            {selectedIds.size} selected
          </span>

          <button
            onClick={() => { setBulkEditForm(EMPTY_BULK_EDIT); setBulkEditOpen(true); }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700"
          >
            Bulk Edit
          </button>

          <div className="flex items-center gap-1.5">
            <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value as PricebookCategory)} className="px-2 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-ds-text dark:text-gray-100">
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <button onClick={handleBulkCategoryChange} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ds-blue text-white hover:bg-blue-700 disabled:opacity-50">
              Category
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input type="number" step="0.1" value={bulkPricePercent} onChange={(e) => setBulkPricePercent(e.target.value)} placeholder="%" className="w-16 px-2 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-ds-text dark:text-gray-100" />
            <button onClick={handleBulkPriceAdjust} disabled={bulkLoading || !bulkPricePercent} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
              Price %
            </button>
          </div>

          <button onClick={() => handleBulkActivate(true)} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ds-green text-white hover:bg-green-700 disabled:opacity-50">
            Activate
          </button>
          <button onClick={() => handleBulkActivate(false)} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ds-red text-white hover:bg-red-700 disabled:opacity-50">
            Deactivate
          </button>
          <button onClick={handleBulkHcpSync} disabled={bulkLoading} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50">
            {bulkLoading ? "Working..." : "Update HCP"}
          </button>

          <button onClick={clearSelection} className="px-3 py-1.5 text-xs text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200 ml-auto">
            Clear
          </button>

          {bulkResult && <span className="w-full text-sm text-ds-gray dark:text-gray-400 mt-1">{bulkResult}</span>}
        </div>
      )}

      {/* Toolbar */}
      <PricebookToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        marginFilter={marginFilter}
        onMarginFilterChange={setMarginFilter}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
      />

      {/* Category tabs */}
      <PricebookCategoryTabs
        categories={categories}
        items={items}
        activeCategory={categoryFilter}
        onCategoryChange={handleCategoryChange}
        onAddCategory={() => setCatModalOpen(true)}
      />

      {/* Drill-down filters */}
      {categoryFilter !== "all" && (isEquipmentFilter ? manufacturers.length > 0 : subcategories.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {isEquipmentFilter ? (
            <>
              <select value={manufacturerFilter} onChange={(e) => { setManufacturerFilter(e.target.value); setSystemTypeFilter("all"); setEfficiencyFilter("all"); }} className="px-3 py-1.5 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-700 text-ds-text dark:text-gray-300 focus:ring-2 focus:ring-ds-blue/30">
                <option value="all">All Manufacturers ({manufacturers.length})</option>
                {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {manufacturerFilter !== "all" && systemTypes.length > 0 && (
                <select value={systemTypeFilter} onChange={(e) => { setSystemTypeFilter(e.target.value); setEfficiencyFilter("all"); }} className="px-3 py-1.5 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-700 text-ds-text dark:text-gray-300 focus:ring-2 focus:ring-ds-blue/30">
                  <option value="all">All System Types ({systemTypes.length})</option>
                  {systemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {systemTypeFilter !== "all" && efficiencyRatings.length > 0 && (
                <select value={efficiencyFilter} onChange={(e) => setEfficiencyFilter(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-700 text-ds-text dark:text-gray-300 focus:ring-2 focus:ring-ds-blue/30">
                  <option value="all">All Ratings ({efficiencyRatings.length})</option>
                  {efficiencyRatings.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              {manufacturerFilter !== "all" && (
                <button onClick={() => { setManufacturerFilter("all"); setSystemTypeFilter("all"); setEfficiencyFilter("all"); }} className="text-xs text-ds-blue dark:text-blue-400 hover:underline">
                  Clear filters
                </button>
              )}
            </>
          ) : (
            <>
              <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-ds-border dark:border-gray-600 bg-ds-card dark:bg-gray-700 text-ds-text dark:text-gray-300 focus:ring-2 focus:ring-ds-blue/30">
                <option value="all">All Subcategories ({subcategories.length})</option>
                {subcategories.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              {subcategoryFilter !== "all" && (
                <button onClick={() => setSubcategoryFilter("all")} className="text-xs text-ds-blue dark:text-blue-400 hover:underline">
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Item count */}
      <p className="text-xs text-ds-gray-lt dark:text-gray-500 mb-2">
        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <PricebookTable
        items={filtered}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onEdit={openEdit}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        onToggleFavorite={handleToggleFavorite}
        filterKey={filterKey}
      />

      {/* Item modal */}
      <PricebookItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
        error={error}
        syncStatus={syncStatus}
        categories={categories}
        suppliers={suppliers}
        items={items}
        markupTiers={markupTiers}
        markupCategories={markupCategories}
        onOpenSupplierModal={() => setSupplierModalOpen(true)}
      />

      {/* Bulk edit modal */}
      <PricebookBulkEditModal
        isOpen={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedCount={selectedIds.size}
        form={bulkEditForm}
        setForm={setBulkEditForm}
        onSave={handleBulkEdit}
        saving={bulkEditSaving}
        categories={categories}
        suppliers={suppliers}
      />

      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setCatModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-display font-bold text-ds-text dark:text-gray-100 mb-4">Add Category</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Category Name</label>
                  <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100" placeholder="e.g., Accessory" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">HCP Type</label>
                  <select value={newCatHcpType} onChange={(e) => setNewCatHcpType(e.target.value as "material" | "service")} className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100">
                    <option value="material">Material (physical items, syncs to HCP)</option>
                    <option value="service">Service (labor/plans, read-only in HCP)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-ds-border dark:border-gray-700">
                <button onClick={() => setCatModalOpen(false)} className="px-4 py-2 text-sm text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200">Cancel</button>
                <button onClick={handleAddCategory} disabled={catSaving || !newCatName.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-blue text-white hover:bg-blue-700 disabled:opacity-50">
                  {catSaving ? "Adding..." : "Add Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setSupplierModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-display font-bold text-ds-text dark:text-gray-100 mb-4">Add Supplier</h2>
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Supplier Name</label>
                <input type="text" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100" placeholder="e.g., Gensco, Ferguson" />
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-ds-border dark:border-gray-700">
                <button onClick={() => setSupplierModalOpen(false)} className="px-4 py-2 text-sm text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200">Cancel</button>
                <button onClick={handleAddSupplier} disabled={supplierSaving || !newSupplierName.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-blue text-white hover:bg-blue-700 disabled:opacity-50">
                  {supplierSaving ? "Adding..." : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
