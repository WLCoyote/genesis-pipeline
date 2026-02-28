"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PricebookItem, PricebookCategory, PricebookCategoryRow, PricebookSupplier, MarkupTier } from "@/lib/types";

interface PricebookManagerProps {
  initialItems: PricebookItem[];
  initialCategories: PricebookCategoryRow[];
  initialSuppliers: PricebookSupplier[];
}

// Refrigerant colors
const REFRIGERANT_OPTIONS = [
  { value: "R-410A", label: "R-410A", color: "bg-pink-400" },
  { value: "R-22", label: "R-22", color: "bg-green-500" },
  { value: "R-454B", label: "R-454B", color: "bg-gray-400 ring-2 ring-red-400" },
  { value: "R-32", label: "R-32", color: "bg-blue-400 ring-2 ring-green-400" },
  { value: "R-134A", label: "R-134A", color: "bg-sky-300" },
  { value: "R-404A", label: "R-404A", color: "bg-orange-400" },
  { value: "R-290", label: "R-290", color: "bg-gray-300 ring-2 ring-red-400" },
];

function refrigerantDot(type: string | null) {
  if (!type) return null;
  const ref = REFRIGERANT_OPTIONS.find((r) => r.value === type);
  if (!ref) return null;
  return (
    <span
      title={ref.label}
      className={`inline-block w-3 h-3 rounded-full ${ref.color} flex-shrink-0`}
    />
  );
}

const EMPTY_FORM = {
  display_name: "",
  category: "equipment" as PricebookCategory,
  hcp_category_name: "",
  system_type: "",
  efficiency_rating: "",
  refrigerant_type: "",
  supplier_id: "",
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
  manual_price: false,
  push_to_hcp: false,
};

export default function PricebookManager({ initialItems, initialCategories, initialSuppliers }: PricebookManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(initialCategories);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [categoryFilter, setCategoryFilter] = useState<PricebookCategory | "all">("all");

  // Categories that support markup auto-suggest (material-type, not service-type)
  const markupCategories = useMemo(
    () => categories.filter((c) => c.hcp_type === "material").map((c) => c.slug),
    [categories]
  );
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [systemTypeFilter, setSystemTypeFilter] = useState<string>("all");
  const [efficiencyFilter, setEfficiencyFilter] = useState<string>("all");
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

  // Selection state (for bulk actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<PricebookCategory>("equipment");
  const [bulkPricePercent, setBulkPricePercent] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  // Category management modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatHcpType, setNewCatHcpType] = useState<"material" | "service">("material");
  const [catSaving, setCatSaving] = useState(false);

  // Supplier management (inline add)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierSaving, setSupplierSaving] = useState(false);

  // Bulk edit modal
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    category: "",
    manufacturer: "",
    model_number: "",
    system_type: "",
    efficiency_rating: "",
    refrigerant_type: "",
    description: "",
    hcp_category_name: "",
    supplier_id: "",
    part_number: "",
    unit_of_measure: "",
    rebate_amount: "",
    spec_line: "",
    taxable: "" as "" | "true" | "false",
    is_commissionable: "" as "" | "true" | "false",
    is_addon: "" as "" | "true" | "false",
    addon_default_checked: "" as "" | "true" | "false",
    is_active: "" as "" | "true" | "false",
  });
  const [bulkEditSaving, setBulkEditSaving] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  // Is equipment category — uses manufacturer → system type → efficiency hierarchy
  const isEquipmentFilter = categoryFilter === "equipment";

  // Compute subcategories (hcp_category_name) for non-equipment categories
  const subcategories = useMemo(() => {
    if (categoryFilter === "all" || isEquipmentFilter) return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === categoryFilter && item.hcp_category_name) {
        names.add(item.hcp_category_name);
      }
    }
    return Array.from(names).sort();
  }, [items, categoryFilter, isEquipmentFilter]);

  // Equipment drill-down: manufacturers for current category
  const manufacturers = useMemo(() => {
    if (!isEquipmentFilter) return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === "equipment" && item.manufacturer) {
        names.add(item.manufacturer);
      }
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter]);

  // Equipment drill-down: system types for selected manufacturer
  const systemTypes = useMemo(() => {
    if (!isEquipmentFilter || manufacturerFilter === "all") return [];
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === "equipment" && item.manufacturer === manufacturerFilter && item.system_type) {
        names.add(item.system_type);
      }
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter, manufacturerFilter]);

  // Equipment drill-down: efficiency ratings for selected manufacturer + system type
  const efficiencyRatings = useMemo(() => {
    if (!isEquipmentFilter || manufacturerFilter === "all" || systemTypeFilter === "all") return [];
    const names = new Set<string>();
    for (const item of items) {
      if (
        item.category === "equipment" &&
        item.manufacturer === manufacturerFilter &&
        item.system_type === systemTypeFilter &&
        item.efficiency_rating
      ) {
        names.add(item.efficiency_rating);
      }
    }
    return Array.from(names).sort();
  }, [items, isEquipmentFilter, manufacturerFilter, systemTypeFilter]);

  // Compute subcategories for the modal form's selected category
  const formSubcategories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === form.category && item.hcp_category_name) {
        names.add(item.hcp_category_name);
      }
    }
    return Array.from(names).sort();
  }, [items, form.category]);

  // Compute system types and efficiency ratings for the modal form
  const formSystemTypes = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === form.category && item.system_type) {
        names.add(item.system_type);
      }
    }
    return Array.from(names).sort();
  }, [items, form.category]);

  const formEfficiencyRatings = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === form.category && item.efficiency_rating) {
        names.add(item.efficiency_rating);
      }
    }
    return Array.from(names).sort();
  }, [items, form.category]);

  // Filter items
  const filtered = useMemo(() => {
    let result = items;

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (subcategoryFilter !== "all") {
      result = result.filter((i) => i.hcp_category_name === subcategoryFilter);
    }

    if (manufacturerFilter !== "all") {
      result = result.filter((i) => i.manufacturer === manufacturerFilter);
    }

    if (systemTypeFilter !== "all") {
      result = result.filter((i) => i.system_type === systemTypeFilter);
    }

    if (efficiencyFilter !== "all") {
      result = result.filter((i) => i.efficiency_rating === efficiencyFilter);
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
  }, [items, categoryFilter, subcategoryFilter, manufacturerFilter, systemTypeFilter, efficiencyFilter, searchQuery, showInactive]);

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
      hcp_category_name: item.hcp_category_name || "",
      system_type: item.system_type || "",
      efficiency_rating: item.efficiency_rating || "",
      refrigerant_type: item.refrigerant_type || "",
      supplier_id: item.supplier_id || "",
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
      manual_price: item.manual_price,
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
      hcp_category_name: form.hcp_category_name.trim() || null,
      system_type: form.system_type.trim() || null,
      efficiency_rating: form.efficiency_rating.trim() || null,
      refrigerant_type: form.refrigerant_type || null,
      supplier_id: form.supplier_id || null,
      manual_price: form.manual_price,
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

  // Reactivate
  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pricebook/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, is_active: true } : i))
        );
        router.refresh();
      }
    } catch {
      // Silently fail — user can retry
    }
  };

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkResult("");
  };

  // Bulk category change
  const handleBulkCategoryChange = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "category", category: bulkCategory }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult(`Error: ${data.error}`);
      } else {
        const catLabel = categories.find((c) => c.slug === bulkCategory)?.name || bulkCategory;
        setBulkResult(`Updated ${data.updated} items to ${catLabel}`);
        setItems((prev) =>
          prev.map((i) => (selectedIds.has(i.id) ? { ...i, category: bulkCategory } : i))
        );
        clearSelection();
        router.refresh();
      }
    } catch {
      setBulkResult("Bulk update failed — network error");
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk activate/deactivate
  const handleBulkActivate = async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: activate ? "activate" : "deactivate" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult(`Error: ${data.error}`);
      } else {
        setBulkResult(`${activate ? "Activated" : "Deactivated"} ${data.updated} items`);
        setItems((prev) =>
          prev.map((i) => (selectedIds.has(i.id) ? { ...i, is_active: activate } : i))
        );
        clearSelection();
        router.refresh();
      }
    } catch {
      setBulkResult("Bulk update failed — network error");
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk price adjust
  const handleBulkPriceAdjust = async () => {
    const pct = parseFloat(bulkPricePercent);
    if (isNaN(pct) || pct === 0 || selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "price_adjust", percent: pct }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult(`Error: ${data.error}`);
      } else {
        setBulkResult(`Adjusted prices by ${pct > 0 ? "+" : ""}${pct}% on ${data.updated} items`);
        clearSelection();
        setBulkPricePercent("");
        router.refresh();
        // Refresh items from server since prices changed
        const itemsRes = await fetch("/api/admin/pricebook?active=");
        const itemsData = await itemsRes.json();
        if (itemsData.items) setItems(itemsData.items);
      }
    } catch {
      setBulkResult("Price adjust failed — network error");
    } finally {
      setBulkLoading(false);
    }
  };

  // Add category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch("/api/admin/pricebook/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), hcp_type: newCatHcpType }),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategories((prev) => [...prev, data.category]);
        setNewCatName("");
        setCatModalOpen(false);
      }
    } catch {
      // Silent fail
    } finally {
      setCatSaving(false);
    }
  };

  // Add supplier
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setSupplierSaving(true);
    try {
      const res = await fetch("/api/admin/pricebook/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.supplier) {
        setSuppliers((prev) => [...prev, data.supplier].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((prev) => ({ ...prev, supplier_id: data.supplier.id }));
        setNewSupplierName("");
        setSupplierModalOpen(false);
      }
    } catch {
      // Silent fail
    } finally {
      setSupplierSaving(false);
    }
  };

  // Bulk edit — apply non-empty fields to all selected items
  const handleBulkEdit = async () => {
    if (selectedIds.size === 0) return;
    setBulkEditSaving(true);
    setBulkResult("");

    // Build fields object — only include non-empty values
    const fields: Record<string, unknown> = {};

    const textFields = [
      "category", "manufacturer", "model_number", "system_type",
      "efficiency_rating", "refrigerant_type", "description",
      "hcp_category_name", "part_number", "unit_of_measure", "spec_line",
    ] as const;

    for (const key of textFields) {
      if (bulkEditForm[key]) {
        fields[key] = bulkEditForm[key];
      }
    }

    if (bulkEditForm.supplier_id) {
      fields.supplier_id = bulkEditForm.supplier_id;
    }

    if (bulkEditForm.rebate_amount) {
      fields.rebate_amount = parseFloat(bulkEditForm.rebate_amount);
    }

    // Boolean fields — only include if explicitly set
    const boolFields = ["taxable", "is_commissionable", "is_addon", "addon_default_checked", "is_active"] as const;
    for (const key of boolFields) {
      if (bulkEditForm[key] === "true") fields[key] = true;
      else if (bulkEditForm[key] === "false") fields[key] = false;
    }

    if (Object.keys(fields).length === 0) {
      setBulkResult("No fields to update — fill in at least one field");
      setBulkEditSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/pricebook/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "edit", fields }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult(`Error: ${data.error}`);
      } else {
        setBulkResult(`Updated ${data.updated} items`);
        // Update local state with returned items
        if (data.items) {
          const updatedMap = new Map<string, PricebookItem>(data.items.map((i: PricebookItem) => [i.id, i]));
          setItems((prev) => prev.map((i) => updatedMap.get(i.id) ?? i));
        }
        setBulkEditOpen(false);
        clearSelection();
        router.refresh();
      }
    } catch {
      setBulkResult("Bulk edit failed — network error");
    } finally {
      setBulkEditSaving(false);
    }
  };

  // Bulk HCP sync
  const handleBulkHcpSync = async () => {
    // Filter to only active items with HCP material links
    const syncableIds = Array.from(selectedIds).filter((id) => {
      const item = items.find((i) => i.id === id);
      return item && item.is_active && item.hcp_uuid && item.hcp_type === "material";
    });

    if (syncableIds.length === 0) {
      setBulkResult("No active HCP materials selected to sync");
      return;
    }

    setBulkLoading(true);
    setBulkResult("");
    try {
      const res = await fetch("/api/admin/pricebook/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: syncableIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult(`Error: ${data.error}`);
      } else {
        const parts = [`Synced: ${data.synced}`];
        if (data.skipped > 0) parts.push(`Skipped: ${data.skipped}`);
        if (data.failed > 0) parts.push(`Failed: ${data.failed}`);
        setBulkResult(parts.join(" | "));
        clearSelection();
      }
    } catch {
      setBulkResult("HCP sync failed — network error");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-40 mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedIds.size} selected
          </span>

          {/* Bulk Edit */}
          <button
            onClick={() => {
              setBulkEditForm({
                category: "", manufacturer: "", model_number: "", system_type: "",
                efficiency_rating: "", refrigerant_type: "", description: "",
                hcp_category_name: "", supplier_id: "", part_number: "",
                unit_of_measure: "", rebate_amount: "", spec_line: "",
                taxable: "", is_commissionable: "", is_addon: "",
                addon_default_checked: "", is_active: "",
              });
              setBulkEditOpen(true);
            }}
            className="px-3 py-1 text-sm font-medium rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            Bulk Edit
          </button>

          {/* Change Category */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value as PricebookCategory)}
              className="px-2 py-1 text-sm rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryChange}
              disabled={bulkLoading}
              className="px-3 py-1 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Category
            </button>
          </div>

          {/* Price Adjust */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              value={bulkPricePercent}
              onChange={(e) => setBulkPricePercent(e.target.value)}
              placeholder="%"
              className="w-16 px-2 py-1 text-sm rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleBulkPriceAdjust}
              disabled={bulkLoading || !bulkPricePercent}
              className="px-3 py-1 text-sm font-medium rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Price %
            </button>
          </div>

          {/* Activate / Deactivate */}
          <button
            onClick={() => handleBulkActivate(true)}
            disabled={bulkLoading}
            className="px-3 py-1 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkActivate(false)}
            disabled={bulkLoading}
            className="px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Deactivate
          </button>

          {/* Update HCP */}
          <button
            onClick={handleBulkHcpSync}
            disabled={bulkLoading}
            className="px-3 py-1 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {bulkLoading ? "Working..." : "Update HCP"}
          </button>

          <button
            onClick={clearSelection}
            className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-auto"
          >
            Clear
          </button>

          {bulkResult && (
            <span className="w-full text-sm text-gray-600 dark:text-gray-400 mt-1">
              {bulkResult}
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Item
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import from HCP"}
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
          {/* Category pills — dynamic from pricebook_categories */}
          <button
            onClick={() => {
              setCategoryFilter("all");
              setSubcategoryFilter("all");
              setManufacturerFilter("all");
              setSystemTypeFilter("all");
              setEfficiencyFilter("all");
            }}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              categoryFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setCategoryFilter(cat.slug);
                setSubcategoryFilter("all");
                setManufacturerFilter("all");
                setSystemTypeFilter("all");
                setEfficiencyFilter("all");
              }}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                categoryFilter === cat.slug
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setCatModalOpen(true)}
            className="px-2 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Add category"
          >
            +
          </button>

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

        {/* Drill-down filters — cascading dropdowns based on category */}
        {categoryFilter !== "all" && (isEquipmentFilter ? manufacturers.length > 0 : subcategories.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {isEquipmentFilter ? (
              <>
                {/* Equipment: Manufacturer → System Type → Efficiency */}
                <select
                  value={manufacturerFilter}
                  onChange={(e) => {
                    setManufacturerFilter(e.target.value);
                    setSystemTypeFilter("all");
                    setEfficiencyFilter("all");
                  }}
                  className="px-3 py-1 text-sm rounded-full border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Manufacturers ({manufacturers.length})</option>
                  {manufacturers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {manufacturerFilter !== "all" && systemTypes.length > 0 && (
                  <select
                    value={systemTypeFilter}
                    onChange={(e) => {
                      setSystemTypeFilter(e.target.value);
                      setEfficiencyFilter("all");
                    }}
                    className="px-3 py-1 text-sm rounded-full border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All System Types ({systemTypes.length})</option>
                    {systemTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                {systemTypeFilter !== "all" && efficiencyRatings.length > 0 && (
                  <select
                    value={efficiencyFilter}
                    onChange={(e) => setEfficiencyFilter(e.target.value)}
                    className="px-3 py-1 text-sm rounded-full border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Ratings ({efficiencyRatings.length})</option>
                    {efficiencyRatings.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}

                {/* Breadcrumb trail */}
                {manufacturerFilter !== "all" && (
                  <button
                    onClick={() => {
                      setManufacturerFilter("all");
                      setSystemTypeFilter("all");
                      setEfficiencyFilter("all");
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Non-equipment: Subcategory */}
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  className="px-3 py-1 text-sm rounded-full border-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Subcategories ({subcategories.length})</option>
                  {subcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>

                {subcategoryFilter !== "all" && (
                  <button
                    onClick={() => setSubcategoryFilter("all")}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        )}
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
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                    Brand
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
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!item.is_active ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        {refrigerantDot(item.refrigerant_type)}
                      </td>
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
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.manufacturer || "—"}
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
                          {item.is_active ? (
                            <button
                              onClick={() => handleDeactivate(item.id)}
                              className="text-red-500 dark:text-red-400 hover:underline text-sm"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(item.id)}
                              className="text-green-600 dark:text-green-400 hover:underline text-sm"
                            >
                              Reactivate
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
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded mt-1"
                      />
                      {refrigerantDot(item.refrigerant_type)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {item.display_name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {item.manufacturer || item.category.replace("_", " ")}
                        </div>
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
                    {item.is_active ? (
                      <button
                        onClick={() => handleDeactivate(item.id)}
                        className="text-red-500 dark:text-red-400 text-sm hover:underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(item.id)}
                        className="text-green-600 dark:text-green-400 text-sm hover:underline"
                      >
                        Reactivate
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
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subcategory
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="subcategory-options"
                      value={form.hcp_category_name}
                      onChange={(e) =>
                        setForm({ ...form, hcp_category_name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Select or type a new subcategory"
                    />
                    <datalist id="subcategory-options">
                      {formSubcategories.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* System Type + Efficiency — for equipment */}
                {form.category === "equipment" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        System Type
                      </label>
                      <input
                        type="text"
                        list="system-type-options"
                        value={form.system_type}
                        onChange={(e) =>
                          setForm({ ...form, system_type: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="e.g., Heat Pump, Furnace"
                      />
                      <datalist id="system-type-options">
                        {formSystemTypes.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Efficiency Rating
                      </label>
                      <input
                        type="text"
                        list="efficiency-rating-options"
                        value={form.efficiency_rating}
                        onChange={(e) =>
                          setForm({ ...form, efficiency_rating: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="e.g., 14 SEER2, 16 SEER2"
                      />
                      <datalist id="efficiency-rating-options">
                        {formEfficiencyRatings.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                )}

                {/* Refrigerant Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refrigerant Type
                  </label>
                  <select
                    value={form.refrigerant_type}
                    onChange={(e) =>
                      setForm({ ...form, refrigerant_type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">None</option>
                    {REFRIGERANT_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
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
                        // Auto-suggest price for markup-eligible categories (skip if manual price)
                        if (
                          !form.manual_price &&
                          markupCategories.includes(form.category) &&
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
                {/* Markup suggestion hint (hidden when manual price is on) */}
                {!form.manual_price &&
                  markupCategories.includes(form.category) &&
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

                {/* Manual price checkbox — shown only for markup-eligible categories */}
                {markupCategories.includes(form.category) && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 -mt-1">
                    <input
                      type="checkbox"
                      checked={form.manual_price}
                      onChange={(e) =>
                        setForm({ ...form, manual_price: e.target.checked })
                      }
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Manual price (skip tier recalculation)
                  </label>
                )}

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

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.supplier_id}
                      onChange={(e) =>
                        setForm({ ...form, supplier_id: e.target.value })
                      }
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSupplierModalOpen(true)}
                      className="px-2 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Add supplier"
                    >
                      +
                    </button>
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
      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setCatModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Add Category
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Accessory"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    HCP Type
                  </label>
                  <select
                    value={newCatHcpType}
                    onChange={(e) => setNewCatHcpType(e.target.value as "material" | "service")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="material">Material (physical items, syncs to HCP)</option>
                    <option value="service">Service (labor/plans, read-only in HCP)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={catSaving || !newCatName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
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
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setSupplierModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                Add Supplier
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Gensco, Ferguson"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  disabled={supplierSaving || !newSupplierName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {supplierSaving ? "Adding..." : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setBulkEditOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                Bulk Edit
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Editing {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}. Only filled fields will be updated.
              </p>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <select
                    value={bulkEditForm.category}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">— No change —</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer + Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Manufacturer</label>
                    <input
                      type="text"
                      value={bulkEditForm.manufacturer}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Model Number</label>
                    <input
                      type="text"
                      value={bulkEditForm.model_number}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, model_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                </div>

                {/* System Type + Efficiency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">System Type</label>
                    <input
                      type="text"
                      value={bulkEditForm.system_type}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, system_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Efficiency Rating</label>
                    <input
                      type="text"
                      value={bulkEditForm.efficiency_rating}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, efficiency_rating: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                </div>

                {/* Refrigerant + Supplier */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Refrigerant Type</label>
                    <select
                      value={bulkEditForm.refrigerant_type}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, refrigerant_type: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">— No change —</option>
                      {REFRIGERANT_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
                    <select
                      value={bulkEditForm.supplier_id}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">— No change —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={bulkEditForm.hcp_category_name}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, hcp_category_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="No change"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                  <textarea
                    value={bulkEditForm.description}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="No change"
                  />
                </div>

                {/* Spec Line */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Spec Line</label>
                  <input
                    type="text"
                    value={bulkEditForm.spec_line}
                    onChange={(e) => setBulkEditForm({ ...bulkEditForm, spec_line: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="No change"
                  />
                </div>

                {/* Part Number + UOM + Rebate */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Part Number</label>
                    <input
                      type="text"
                      value={bulkEditForm.part_number}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, part_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={bulkEditForm.unit_of_measure}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, unit_of_measure: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rebate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkEditForm.rebate_amount}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, rebate_amount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="No change"
                    />
                  </div>
                </div>

                {/* Boolean toggles — tri-state: no change / yes / no */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["taxable", "Taxable"],
                    ["is_commissionable", "Commissionable"],
                    ["is_addon", "Add-on"],
                    ["addon_default_checked", "Add-on Pre-checked"],
                    ["is_active", "Active"],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                      <select
                        value={bulkEditForm[key]}
                        onChange={(e) => setBulkEditForm({ ...bulkEditForm, [key]: e.target.value as "" | "true" | "false" })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">— No change —</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setBulkEditOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkEdit}
                  disabled={bulkEditSaving}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {bulkEditSaving ? "Updating..." : `Update ${selectedIds.size} Items`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
