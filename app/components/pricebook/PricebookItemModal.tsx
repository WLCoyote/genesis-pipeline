"use client";

import { useMemo } from "react";
import type { PricebookItem, PricebookCategory, PricebookCategoryRow, PricebookSupplier, MarkupTier } from "@/lib/types";

const REFRIGERANT_OPTIONS = [
  { value: "R-410A", label: "R-410A" },
  { value: "R-22", label: "R-22" },
  { value: "R-454B", label: "R-454B" },
  { value: "R-32", label: "R-32" },
  { value: "R-134A", label: "R-134A" },
  { value: "R-404A", label: "R-404A" },
  { value: "R-290", label: "R-290" },
];

export interface ItemFormState {
  display_name: string;
  category: PricebookCategory;
  hcp_category_name: string;
  system_type: string;
  efficiency_rating: string;
  refrigerant_type: string;
  supplier_id: string;
  spec_line: string;
  description: string;
  unit_price: string;
  cost: string;
  unit_of_measure: string;
  manufacturer: string;
  model_number: string;
  part_number: string;
  is_addon: boolean;
  addon_default_checked: boolean;
  is_commissionable: boolean;
  rebate_amount: string;
  taxable: boolean;
  is_active: boolean;
  manual_price: boolean;
  push_to_hcp: boolean;
}

export const EMPTY_FORM: ItemFormState = {
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

export function itemToForm(item: PricebookItem): ItemFormState {
  return {
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
  };
}

type FieldGroup = 'subcategory' | 'systemType' | 'refrigerant' | 'specLine' | 'cost' |
  'manufacturer' | 'supplier' | 'partNumber' | 'unitOfMeasure' | 'rebateAmount' |
  'taxable' | 'commissionable' | 'addon' | 'price' | 'pushToHcp';

function getVisibleFields(category: string): Set<FieldGroup> {
  const EQUIPMENT = ['equipment', 'indoor', 'outdoor', 'cased_coil'];
  const PARTS = ['material', 'accessory', 'electrical', 'controls'];
  const UNIVERSAL: FieldGroup[] = ['subcategory', 'cost', 'price', 'pushToHcp'];
  const ALL_PRODUCT: FieldGroup[] = [...UNIVERSAL, 'refrigerant', 'specLine', 'manufacturer',
    'supplier', 'partNumber', 'unitOfMeasure', 'rebateAmount', 'taxable', 'commissionable', 'addon'];

  if (EQUIPMENT.includes(category))
    return new Set([...ALL_PRODUCT, 'systemType'] as FieldGroup[]);
  if (PARTS.includes(category))
    return new Set(ALL_PRODUCT);
  if (category === 'labor')
    return new Set<FieldGroup>([...UNIVERSAL, 'unitOfMeasure', 'taxable', 'commissionable', 'addon']);
  if (['service_plan', 'maintenance_plan'].includes(category))
    return new Set<FieldGroup>([...UNIVERSAL, 'taxable', 'commissionable', 'addon']);
  if (['equipment_warranty', 'labor_warranty'].includes(category))
    return new Set<FieldGroup>([...UNIVERSAL, 'taxable', 'addon']);
  if (category === 'exclusion')
    return new Set<FieldGroup>(UNIVERSAL);
  if (category === 'rebate')
    return new Set<FieldGroup>(UNIVERSAL);
  return new Set([...ALL_PRODUCT, 'systemType'] as FieldGroup[]);
}

interface PricebookItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: string | null;
  form: ItemFormState;
  setForm: (f: ItemFormState) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  syncStatus: string;
  categories: PricebookCategoryRow[];
  suppliers: PricebookSupplier[];
  items: PricebookItem[];
  markupTiers: MarkupTier[];
  markupCategories: string[];
  onOpenSupplierModal: () => void;
}

export default function PricebookItemModal({
  isOpen,
  onClose,
  editingId,
  form,
  setForm,
  onSave,
  saving,
  error,
  syncStatus,
  categories,
  suppliers,
  items,
  markupTiers,
  markupCategories,
  onOpenSupplierModal,
}: PricebookItemModalProps) {
  const visibleFields = useMemo(() => getVisibleFields(form.category), [form.category]);

  const formSubcategories = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.category === form.category && item.hcp_category_name) {
        names.add(item.hcp_category_name);
      }
    }
    return Array.from(names).sort();
  }, [items, form.category]);

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

  const findTier = (cost: number): MarkupTier | null => {
    if (cost <= 0 || markupTiers.length === 0) return null;
    return markupTiers.find((t) => cost >= t.min_cost && (t.max_cost === null || cost <= t.max_cost)) ?? null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-display font-bold text-ds-text dark:text-gray-100 mb-4">
            {editingId ? "Edit Item" : "Add Pricebook Item"}
          </h2>

          {error && (
            <div className="mb-4 p-2 bg-ds-red-bg dark:bg-red-900/20 text-ds-red dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {syncStatus && (
            <div className="mb-4 p-2 bg-ds-blue-bg dark:bg-blue-900/20 text-ds-blue dark:text-blue-400 text-sm rounded-lg">
              {syncStatus}
            </div>
          )}

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                placeholder="e.g., Mitsubishi Hyper Heat — Premium System"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as PricebookCategory })}
                className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {visibleFields.has('subcategory') && (
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Subcategory</label>
                <input
                  type="text"
                  list="subcategory-options"
                  value={form.hcp_category_name}
                  onChange={(e) => setForm({ ...form, hcp_category_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  placeholder="Select or type a new subcategory"
                />
                <datalist id="subcategory-options">
                  {formSubcategories.map((sub) => <option key={sub} value={sub} />)}
                </datalist>
              </div>
            )}

            {/* System Type + Efficiency */}
            {visibleFields.has('systemType') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">System Type</label>
                  <input
                    type="text"
                    list="system-type-options"
                    value={form.system_type}
                    onChange={(e) => setForm({ ...form, system_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                    placeholder="e.g., Heat Pump, Furnace"
                  />
                  <datalist id="system-type-options">
                    {formSystemTypes.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Efficiency Rating</label>
                  <input
                    type="text"
                    list="efficiency-rating-options"
                    value={form.efficiency_rating}
                    onChange={(e) => setForm({ ...form, efficiency_rating: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                    placeholder="e.g., 14 SEER2"
                  />
                  <datalist id="efficiency-rating-options">
                    {formEfficiencyRatings.map((r) => <option key={r} value={r} />)}
                  </datalist>
                </div>
              </div>
            )}

            {/* Refrigerant */}
            {visibleFields.has('refrigerant') && (
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Refrigerant Type</label>
                <select
                  value={form.refrigerant_type}
                  onChange={(e) => setForm({ ...form, refrigerant_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                >
                  <option value="">None</option>
                  {REFRIGERANT_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            {/* Spec Line */}
            {visibleFields.has('specLine') && (
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Spec Line</label>
                <input
                  type="text"
                  value={form.spec_line}
                  onChange={(e) => setForm({ ...form, spec_line: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  placeholder="e.g., 3 Ton SVZ | Hyper Heat | -13°F Rated"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                placeholder="Customer-facing value statement"
              />
            </div>

            {/* Price + Cost */}
            {(visibleFields.has('price') || visibleFields.has('cost')) && (
              <div className={visibleFields.has('price') && visibleFields.has('cost') ? "grid grid-cols-2 gap-3" : ""}>
                {visibleFields.has('price') && (
                  <div>
                    <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.unit_price}
                      onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                )}
                {visibleFields.has('cost') && (
                  <div>
                    <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => {
                        const newCost = e.target.value;
                        const updates: Partial<ItemFormState> = { cost: newCost };
                        if (!form.manual_price && markupCategories.includes(form.category) && newCost) {
                          const costNum = parseFloat(newCost);
                          const tier = findTier(costNum);
                          if (tier) {
                            updates.unit_price = (costNum * tier.multiplier).toFixed(2);
                          }
                        }
                        setForm({ ...form, ...updates });
                      }}
                      className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Manual price */}
            <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 -mt-1">
              <input
                type="checkbox"
                checked={form.manual_price}
                onChange={(e) => setForm({ ...form, manual_price: e.target.checked })}
                className="rounded border-ds-border dark:border-gray-600"
              />
              Manual price (skip tier recalculation)
            </label>

            {/* Manufacturer + Model */}
            {visibleFields.has('manufacturer') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Model Number</label>
                  <input
                    type="text"
                    value={form.model_number}
                    onChange={(e) => setForm({ ...form, model_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Supplier */}
            {visibleFields.has('supplier') && (
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Supplier</label>
                <div className="flex gap-2">
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={onOpenSupplierModal}
                    className="px-2 py-2 text-sm rounded-lg bg-ds-bg dark:bg-gray-700 text-ds-gray-lt dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Add supplier"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Part Number + UOM */}
            {(visibleFields.has('partNumber') || visibleFields.has('unitOfMeasure')) && (
              <div className={visibleFields.has('partNumber') && visibleFields.has('unitOfMeasure') ? "grid grid-cols-2 gap-3" : ""}>
                {visibleFields.has('partNumber') && (
                  <div>
                    <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Part Number</label>
                    <input
                      type="text"
                      value={form.part_number}
                      onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                    />
                  </div>
                )}
                {visibleFields.has('unitOfMeasure') && (
                  <div>
                    <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={form.unit_of_measure}
                      onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                      placeholder="e.g., each, ft, hr"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Rebate */}
            {visibleFields.has('rebateAmount') && (
              <div>
                <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">Rebate Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.rebate_amount}
                  onChange={(e) => setForm({ ...form, rebate_amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-2">
              {visibleFields.has('taxable') && (
                <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} className="rounded" />
                  Taxable
                </label>
              )}
              {visibleFields.has('commissionable') && (
                <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.is_commissionable} onChange={(e) => setForm({ ...form, is_commissionable: e.target.checked })} className="rounded" />
                  Commissionable
                </label>
              )}
              {visibleFields.has('addon') && (
                <>
                  <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.is_addon} onChange={(e) => setForm({ ...form, is_addon: e.target.checked })} className="rounded" />
                    Add-on (checkbox on proposal)
                  </label>
                  {form.is_addon && (
                    <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer ml-6">
                      <input type="checkbox" checked={form.addon_default_checked} onChange={(e) => setForm({ ...form, addon_default_checked: e.target.checked })} className="rounded" />
                      Pre-checked by default
                    </label>
                  )}
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                Active
              </label>
              {visibleFields.has('pushToHcp') && editingId && (
                <label className="flex items-center gap-2 text-sm text-ds-text-lt dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.push_to_hcp} onChange={(e) => setForm({ ...form, push_to_hcp: e.target.checked })} className="rounded" />
                  Push to HCP (creates material in Housecall Pro)
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-ds-border dark:border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-ds-blue text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
