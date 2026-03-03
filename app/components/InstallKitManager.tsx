"use client";

import { useState, useMemo } from "react";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";

interface PricebookItemPick {
  id: string;
  display_name: string;
  unit_price: number | null;
  cost: number | null;
  category: string;
  system_type?: string | null;
  manufacturer?: string | null;
  model_number?: string | null;
}

interface KitItemRow {
  pricebook_item_id: string;
  quantity: number;
  sort_order: number;
  pricebook_items?: PricebookItemPick | null;
}

interface KitRow {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
  is_active: boolean;
  install_kit_items: KitItemRow[];
}

interface KitForm {
  id?: string;
  name: string;
  description: string;
  system_type: string;
  is_active: boolean;
  items: { pricebook_item_id: string; quantity: number; display_name: string; unit_price: number }[];
}

const EMPTY_FORM: KitForm = {
  name: "",
  description: "",
  system_type: "",
  is_active: true,
  items: [],
};

function formatCurrency(v: number): string {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  initialKits: KitRow[];
  pricebookItems: PricebookItemPick[];
}

export default function InstallKitManager({ initialKits, pricebookItems }: Props) {
  const [kits, setKits] = useState<KitRow[]>(initialKits);
  const [editing, setEditing] = useState<KitForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  function openCreate() {
    setEditing({ ...EMPTY_FORM, items: [] });
    setError(null);
    setItemSearch("");
  }

  function openEdit(kit: KitRow) {
    setEditing({
      id: kit.id,
      name: kit.name,
      description: kit.description || "",
      system_type: kit.system_type || "",
      is_active: kit.is_active,
      items: kit.install_kit_items.map((i) => ({
        pricebook_item_id: i.pricebook_item_id,
        quantity: i.quantity,
        display_name: i.pricebook_items?.display_name || "Unknown",
        unit_price: i.pricebook_items?.unit_price ?? 0,
      })),
    });
    setError(null);
    setItemSearch("");
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
      system_type: editing.system_type || null,
      is_active: editing.is_active,
      items: editing.items.map((item, i) => ({
        pricebook_item_id: item.pricebook_item_id,
        quantity: item.quantity,
        sort_order: i,
      })),
    };

    try {
      const url = editing.id
        ? `/api/admin/install-kits/${editing.id}`
        : "/api/admin/install-kits";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // Refresh list
      const listRes = await fetch("/api/admin/install-kits");
      const listData = await listRes.json();
      setKits(listData.kits || []);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this kit? It will no longer appear in the quote builder.")) return;
    const res = await fetch(`/api/admin/install-kits/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKits(kits.map((k) => (k.id === id ? { ...k, is_active: false } : k)));
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/admin/install-kits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      setKits(kits.map((k) => (k.id === id ? { ...k, is_active: true } : k)));
    }
  }

  function addItemToKit(item: PricebookItemPick) {
    if (!editing) return;
    // Skip if already in kit
    if (editing.items.some((i) => i.pricebook_item_id === item.id)) return;
    setEditing({
      ...editing,
      items: [
        ...editing.items,
        {
          pricebook_item_id: item.id,
          quantity: 1,
          display_name: item.display_name,
          unit_price: item.unit_price ?? 0,
        },
      ],
    });
  }

  function removeItemFromKit(pricebookItemId: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      items: editing.items.filter((i) => i.pricebook_item_id !== pricebookItemId),
    });
  }

  function updateItemQuantity(pricebookItemId: string, qty: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      items: editing.items.map((i) =>
        i.pricebook_item_id === pricebookItemId ? { ...i, quantity: Math.max(1, qty) } : i
      ),
    });
  }

  // Filter pricebook items for picker
  const filteredPricebook = useMemo(() => {
    if (!itemSearch) return pricebookItems.slice(0, 20);
    const q = itemSearch.toLowerCase();
    return pricebookItems
      .filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.manufacturer?.toLowerCase().includes(q) ||
          p.model_number?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [pricebookItems, itemSearch]);

  // Kit total cost
  const kitTotal = editing
    ? editing.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    : 0;

  const activeItemIds = new Set(editing?.items.map((i) => i.pricebook_item_id) || []);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {kits.filter((k) => k.is_active).length} active kit{kits.filter((k) => k.is_active).length !== 1 ? "s" : ""}
        </span>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Kit
        </Button>
      </div>

      {/* Kits table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">System Type</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Items</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Total Price</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {kits.map((kit) => {
              const total = kit.install_kit_items.reduce(
                (sum, i) => sum + (i.pricebook_items?.unit_price ?? 0) * i.quantity,
                0
              );
              return (
                <tr
                  key={kit.id}
                  className={`border-b border-gray-100 dark:border-gray-700/50 ${
                    !kit.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{kit.name}</div>
                    {kit.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kit.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                    {kit.system_type || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                    {kit.install_kit_items.length}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(total)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        kit.is_active
                          ? "bg-ds-green-bg text-ds-green"
                          : "bg-ds-red-bg text-ds-red"
                      }`}
                    >
                      {kit.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => openEdit(kit)}
                      className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                    >
                      Edit
                    </Button>
                    {kit.is_active ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeactivate(kit.id)}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleReactivate(kit.id)}
                        className="text-green-600 dark:text-green-400 hover:underline"
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {kits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No install kits. Click &quot;+ Add Kit&quot; to create one.
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
        title={editing?.id ? "Edit Install Kit" : "Create Install Kit"}
        maxWidth="2xl"
      >
        {editing && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Kit metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kit Name</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g., Standard AC Install Kit"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">System Type</label>
                  <input
                    type="text"
                    value={editing.system_type}
                    onChange={(e) => setEditing({ ...editing, system_type: e.target.value })}
                    placeholder="e.g., Split System, Heat Pump"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Brief description of what this kit includes"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              {/* Items in kit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Kit Items ({editing.items.length})
                  </label>
                  {kitTotal > 0 && (
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Total: {formatCurrency(kitTotal)}
                    </span>
                  )}
                </div>

                {editing.items.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-100 dark:divide-gray-700 mb-3">
                    {editing.items.map((item) => (
                      <div key={item.pricebook_item_id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {item.display_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.unit_price)} ea
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-500 dark:text-gray-400">Qty:</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.pricebook_item_id, parseInt(e.target.value) || 1)
                            }
                            className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 w-20 text-right">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </div>
                        <button
                          onClick={() => removeItemFromKit(item.pricebook_item_id)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold ml-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Item search/picker */}
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search pricebook items to add..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredPricebook.map((item) => {
                      const added = activeItemIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => addItemToKit(item)}
                          disabled={added}
                          className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors ${
                            added
                              ? "bg-gray-50 dark:bg-gray-700/50 text-gray-400 cursor-default"
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span className="flex-1 truncate">{item.display_name}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {item.category}
                          </span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
                            {formatCurrency(item.unit_price ?? 0)}
                          </span>
                          {added && (
                            <span className="text-[10px] text-ds-green font-bold shrink-0">Added</span>
                          )}
                        </button>
                      );
                    })}
                    {filteredPricebook.length === 0 && (
                      <div className="text-center py-3 text-sm text-gray-400">No items found</div>
                    )}
                  </div>
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
                {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Kit"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
