"use client";

import type { PricebookCategoryRow, PricebookSupplier } from "@/lib/types";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import { inputCls, selectCls, textareaCls } from "@/app/components/ui/FormField";

const REFRIGERANT_OPTIONS = [
  { value: "R-410A", label: "R-410A" },
  { value: "R-22", label: "R-22" },
  { value: "R-454B", label: "R-454B" },
  { value: "R-32", label: "R-32" },
  { value: "R-134A", label: "R-134A" },
  { value: "R-404A", label: "R-404A" },
  { value: "R-290", label: "R-290" },
];

export interface BulkEditFormState {
  category: string;
  manufacturer: string;
  model_number: string;
  system_type: string;
  efficiency_rating: string;
  refrigerant_type: string;
  description: string;
  hcp_category_name: string;
  supplier_id: string;
  part_number: string;
  unit_of_measure: string;
  rebate_amount: string;
  spec_line: string;
  taxable: "" | "true" | "false";
  is_commissionable: "" | "true" | "false";
  is_addon: "" | "true" | "false";
  addon_default_checked: "" | "true" | "false";
  is_active: "" | "true" | "false";
}

export const EMPTY_BULK_EDIT: BulkEditFormState = {
  category: "", manufacturer: "", model_number: "", system_type: "",
  efficiency_rating: "", refrigerant_type: "", description: "",
  hcp_category_name: "", supplier_id: "", part_number: "",
  unit_of_measure: "", rebate_amount: "", spec_line: "",
  taxable: "", is_commissionable: "", is_addon: "",
  addon_default_checked: "", is_active: "",
};

interface PricebookBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  form: BulkEditFormState;
  setForm: (f: BulkEditFormState) => void;
  onSave: () => void;
  saving: boolean;
  categories: PricebookCategoryRow[];
  suppliers: PricebookSupplier[];
}

export default function PricebookBulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  form,
  setForm,
  onSave,
  saving,
  categories,
  suppliers,
}: PricebookBulkEditModalProps) {
  return (
    <Modal open={isOpen} onClose={onClose} title="Bulk Edit">
          <p className="text-sm text-ds-gray dark:text-gray-400 mb-4 -mt-2">
            Editing {selectedCount} item{selectedCount !== 1 ? "s" : ""}. Only filled fields will be updated.
          </p>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectCls}>
                <option value="">— No change —</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            {/* Manufacturer + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Manufacturer</label>
                <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Model Number</label>
                <input type="text" value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
            </div>

            {/* System Type + Efficiency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">System Type</label>
                <input type="text" value={form.system_type} onChange={(e) => setForm({ ...form, system_type: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Efficiency Rating</label>
                <input type="text" value={form.efficiency_rating} onChange={(e) => setForm({ ...form, efficiency_rating: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
            </div>

            {/* Refrigerant + Supplier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Refrigerant Type</label>
                <select value={form.refrigerant_type} onChange={(e) => setForm({ ...form, refrigerant_type: e.target.value })} className={selectCls}>
                  <option value="">— No change —</option>
                  {REFRIGERANT_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Supplier</label>
                <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className={selectCls}>
                  <option value="">— No change —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Subcategory</label>
              <input type="text" value={form.hcp_category_name} onChange={(e) => setForm({ ...form, hcp_category_name: e.target.value })} className={inputCls} placeholder="No change" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={textareaCls} placeholder="No change" />
            </div>

            {/* Spec Line */}
            <div>
              <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Spec Line</label>
              <input type="text" value={form.spec_line} onChange={(e) => setForm({ ...form, spec_line: e.target.value })} className={inputCls} placeholder="No change" />
            </div>

            {/* Part Number + UOM + Rebate */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Part Number</label>
                <input type="text" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Unit of Measure</label>
                <input type="text" value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">Rebate ($)</label>
                <input type="number" step="0.01" value={form.rebate_amount} onChange={(e) => setForm({ ...form, rebate_amount: e.target.value })} className={inputCls} placeholder="No change" />
              </div>
            </div>

            {/* Boolean toggles */}
            <div className="grid grid-cols-2 gap-3">
              {([
                ["taxable", "Taxable"],
                ["is_commissionable", "Commissionable"],
                ["is_addon", "Add-on"],
                ["addon_default_checked", "Add-on Pre-checked"],
                ["is_active", "Active"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-ds-gray dark:text-gray-400 mb-1">{label}</label>
                  <select
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value as "" | "true" | "false" })}
                    className={selectCls}
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
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-ds-border dark:border-gray-700">
            <Button variant="ghost" size="md" onClick={onClose} className="text-ds-gray hover:text-ds-text dark:text-gray-400 dark:hover:text-gray-200">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? "Updating..." : `Update ${selectedCount} Items`}
            </Button>
          </div>
    </Modal>
  );
}
