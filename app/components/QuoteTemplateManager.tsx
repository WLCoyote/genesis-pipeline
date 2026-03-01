"use client";

import { useState, useMemo } from "react";

interface PricebookItemSlim {
  id: string;
  display_name: string;
  spec_line: string | null;
  unit_price: number | null;
  cost: number | null;
  manufacturer: string | null;
  model_number: string | null;
  category: string;
  system_type: string | null;
  efficiency_rating: string | null;
  is_addon: boolean;
  addon_default_checked: boolean;
  unit_of_measure: string | null;
}

interface TemplateTierRow {
  id: string;
  tier_number: number;
  tier_name: string;
  tagline: string | null;
  is_recommended: boolean;
  image_url: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
  created_by: string;
  is_shared: boolean;
  is_active: boolean;
  created_at: string;
  quote_template_tiers: TemplateTierRow[];
  users: { name: string } | null;
}

interface TierItemForm {
  pricebook_item_id: string;
  display_name: string;
  unit_price: number | null;
  quantity: number;
  is_addon: boolean;
  addon_default_checked: boolean;
}

interface TierForm {
  tier_number: number;
  tier_name: string;
  tagline: string;
  feature_bullets: string[];
  is_recommended: boolean;
  image_url: string;
  items: TierItemForm[];
}

interface TemplateForm {
  id?: string;
  name: string;
  description: string;
  system_type: string;
  is_shared: boolean;
  tiers: TierForm[];
}

const DEFAULT_TIER_NAMES = ["Standard Comfort", "Enhanced Efficiency", "Premium Performance"];
const DEFAULT_TAGLINES = [
  "Reliable performance at an honest price",
  "The sweet spot of comfort & savings",
  "Maximum comfort, minimum energy bill",
];

function emptyTier(tierNumber: number): TierForm {
  return {
    tier_number: tierNumber,
    tier_name: DEFAULT_TIER_NAMES[tierNumber - 1] || `Tier ${tierNumber}`,
    tagline: DEFAULT_TAGLINES[tierNumber - 1] || "",
    feature_bullets: [],
    is_recommended: tierNumber === 2,
    image_url: "",
    items: [],
  };
}

function emptyTemplate(): TemplateForm {
  return {
    name: "",
    description: "",
    system_type: "",
    is_shared: false,
    tiers: [emptyTier(1), emptyTier(2), emptyTier(3)],
  };
}

interface Props {
  initialTemplates: TemplateRow[];
  pricebookItems: PricebookItemSlim[];
  isAdmin: boolean;
}

export default function QuoteTemplateManager({
  initialTemplates,
  pricebookItems,
  isAdmin,
}: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<TemplateForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState(0); // Which tier tab is active in modal

  // Item picker state
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategory, setItemCategory] = useState("all");

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.system_type && t.system_type.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const categories = useMemo(() => {
    const cats = new Set(pricebookItems.map((i) => i.category));
    return Array.from(cats).sort();
  }, [pricebookItems]);

  const filteredPricebookItems = useMemo(() => {
    let items = pricebookItems;
    if (itemCategory !== "all") {
      items = items.filter((i) => i.category === itemCategory);
    }
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      items = items.filter(
        (i) =>
          i.display_name.toLowerCase().includes(q) ||
          (i.manufacturer && i.manufacturer.toLowerCase().includes(q)) ||
          (i.model_number && i.model_number.toLowerCase().includes(q))
      );
    }
    return items;
  }, [pricebookItems, itemCategory, itemSearch]);

  function openCreate() {
    setEditing(emptyTemplate());
    setActiveTier(0);
    setError(null);
  }

  async function openEdit(templateId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/quote-templates/${templateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const t = data.template;
      const tiers: TierForm[] = [1, 2, 3].map((n) => {
        const existing = t.quote_template_tiers?.find(
          (tier: { tier_number: number }) => tier.tier_number === n
        );
        if (!existing) return emptyTier(n);

        return {
          tier_number: n,
          tier_name: existing.tier_name,
          tagline: existing.tagline || "",
          feature_bullets: existing.feature_bullets || [],
          is_recommended: existing.is_recommended,
          image_url: existing.image_url || "",
          items: (existing.quote_template_items || []).map(
            (item: {
              pricebook_item_id: string;
              quantity: number;
              is_addon: boolean;
              addon_default_checked: boolean;
              pricebook_items: { display_name: string; unit_price: number | null };
            }) => ({
              pricebook_item_id: item.pricebook_item_id,
              display_name: item.pricebook_items?.display_name || "Unknown",
              unit_price: item.pricebook_items?.unit_price ?? null,
              quantity: item.quantity,
              is_addon: item.is_addon,
              addon_default_checked: item.addon_default_checked,
            })
          ),
        };
      });

      setEditing({
        id: t.id,
        name: t.name,
        description: t.description || "",
        system_type: t.system_type || "",
        is_shared: t.is_shared,
        tiers,
      });
      setActiveTier(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    }
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    // Build payload
    const payload = {
      name: editing.name,
      description: editing.description || null,
      system_type: editing.system_type || null,
      is_shared: editing.is_shared,
      tiers: editing.tiers
        .filter((t) => t.tier_name) // Only save tiers that have a name
        .map((t) => ({
          tier_number: t.tier_number,
          tier_name: t.tier_name,
          tagline: t.tagline || null,
          feature_bullets: t.feature_bullets,
          is_recommended: t.is_recommended,
          image_url: t.image_url || null,
          items: t.items.map((item, idx) => ({
            pricebook_item_id: item.pricebook_item_id,
            quantity: item.quantity,
            is_addon: item.is_addon,
            addon_default_checked: item.addon_default_checked,
            sort_order: idx,
          })),
        })),
    };

    try {
      const url = editing.id
        ? `/api/admin/quote-templates/${editing.id}`
        : "/api/admin/quote-templates";
      const method = editing.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      // Refresh list
      const listRes = await fetch("/api/admin/quote-templates");
      const listData = await listRes.json();
      setTemplates(listData.templates || []);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: string) {
    if (!confirm("Delete this template? It will no longer appear in the template list.")) return;

    const res = await fetch(`/api/admin/quote-templates/${templateId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTemplates(templates.filter((t) => t.id !== templateId));
    }
  }

  // Tier item management
  function addItemToTier(item: PricebookItemSlim) {
    if (!editing) return;
    const tier = editing.tiers[activeTier];
    if (tier.items.some((i) => i.pricebook_item_id === item.id)) return; // Already added

    const updatedTiers = [...editing.tiers];
    updatedTiers[activeTier] = {
      ...tier,
      items: [
        ...tier.items,
        {
          pricebook_item_id: item.id,
          display_name: item.display_name,
          unit_price: item.unit_price,
          quantity: 1,
          is_addon: item.is_addon,
          addon_default_checked: item.addon_default_checked,
        },
      ],
    };
    setEditing({ ...editing, tiers: updatedTiers });
  }

  function removeItemFromTier(tierIdx: number, itemIdx: number) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    const tier = { ...updatedTiers[tierIdx] };
    tier.items = tier.items.filter((_, i) => i !== itemIdx);
    updatedTiers[tierIdx] = tier;
    setEditing({ ...editing, tiers: updatedTiers });
  }

  function updateItemQuantity(tierIdx: number, itemIdx: number, qty: number) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    const tier = { ...updatedTiers[tierIdx] };
    tier.items = tier.items.map((item, i) =>
      i === itemIdx ? { ...item, quantity: qty } : item
    );
    updatedTiers[tierIdx] = tier;
    setEditing({ ...editing, tiers: updatedTiers });
  }

  // Feature bullet management
  function addBullet(tierIdx: number) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    updatedTiers[tierIdx] = {
      ...updatedTiers[tierIdx],
      feature_bullets: [...updatedTiers[tierIdx].feature_bullets, ""],
    };
    setEditing({ ...editing, tiers: updatedTiers });
  }

  function updateBullet(tierIdx: number, bulletIdx: number, value: string) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    const bullets = [...updatedTiers[tierIdx].feature_bullets];
    bullets[bulletIdx] = value;
    updatedTiers[tierIdx] = { ...updatedTiers[tierIdx], feature_bullets: bullets };
    setEditing({ ...editing, tiers: updatedTiers });
  }

  function removeBullet(tierIdx: number, bulletIdx: number) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    updatedTiers[tierIdx] = {
      ...updatedTiers[tierIdx],
      feature_bullets: updatedTiers[tierIdx].feature_bullets.filter((_, i) => i !== bulletIdx),
    };
    setEditing({ ...editing, tiers: updatedTiers });
  }

  function updateTierField(tierIdx: number, field: string, value: string | boolean) {
    if (!editing) return;
    const updatedTiers = [...editing.tiers];
    updatedTiers[tierIdx] = { ...updatedTiers[tierIdx], [field]: value };
    // If setting is_recommended, unset others
    if (field === "is_recommended" && value === true) {
      updatedTiers.forEach((t, i) => {
        if (i !== tierIdx) updatedTiers[i] = { ...t, is_recommended: false };
      });
    }
    setEditing({ ...editing, tiers: updatedTiers });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        />
        <button
          onClick={openCreate}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap"
        >
          + New Template
        </button>
      </div>

      {/* Templates list */}
      <div className="space-y-3">
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {t.name}
                  </h3>
                  {t.is_shared && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                      Shared
                    </span>
                  )}
                  {t.system_type && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {t.system_type}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>
                    {t.quote_template_tiers?.length || 0} tier{(t.quote_template_tiers?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  <span>By {t.users?.name || "Unknown"}</span>
                  {t.quote_template_tiers?.map((tier) => (
                    <span key={tier.id} className="flex items-center gap-1">
                      {tier.is_recommended && "★ "}
                      {tier.tier_name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(t.id)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-red-600 dark:text-red-400 hover:underline text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No templates yet. Click &quot;+ New Template&quot; to create one.
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editing.id ? "Edit Template" : "New Template"}
              </h2>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Template metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g., Lennox Furnace + AC Replacement"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">System Type</label>
                  <input
                    type="text"
                    value={editing.system_type}
                    onChange={(e) => setEditing({ ...editing, system_type: e.target.value })}
                    placeholder="e.g., furnace_ac, heat_pump, mini_split"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                {isAdmin && (
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={editing.is_shared}
                        onChange={(e) => setEditing({ ...editing, is_shared: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      Shared with all users
                    </label>
                  </div>
                )}
              </div>

              {/* Tier tabs */}
              <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                {editing.tiers.map((tier, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTier(idx)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTier === idx
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    Tier {tier.tier_number}: {tier.tier_name || `Tier ${tier.tier_number}`}
                    {tier.is_recommended && " ★"}
                    <span className="ml-1 text-xs text-gray-400">({tier.items.length})</span>
                  </button>
                ))}
              </div>

              {/* Active tier editor */}
              {editing.tiers[activeTier] && (
                <div className="space-y-4">
                  {/* Tier metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tier Name</label>
                      <input
                        type="text"
                        value={editing.tiers[activeTier].tier_name}
                        onChange={(e) => updateTierField(activeTier, "tier_name", e.target.value)}
                        placeholder="e.g., Standard Comfort"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tagline</label>
                      <input
                        type="text"
                        value={editing.tiers[activeTier].tagline}
                        onChange={(e) => updateTierField(activeTier, "tagline", e.target.value)}
                        placeholder="e.g., The sweet spot of comfort & savings"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={editing.tiers[activeTier].is_recommended}
                      onChange={(e) => updateTierField(activeTier, "is_recommended", e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Recommended tier (shows &quot;Most Popular&quot; badge on proposal)
                  </label>

                  {/* Feature bullets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Feature Bullets (shown on proposal)
                      </label>
                      <button
                        onClick={() => addBullet(activeTier)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Bullet
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editing.tiers[activeTier].feature_bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateBullet(activeTier, bIdx, e.target.value)}
                            placeholder="e.g., 96% AFUE Two-Stage Gas Furnace"
                            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          />
                          <button
                            onClick={() => removeBullet(activeTier, bIdx)}
                            className="text-red-400 hover:text-red-600 text-sm px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {editing.tiers[activeTier].feature_bullets.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                          No feature bullets yet. These are the selling points customers see on the proposal.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tier items */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Items in this tier
                    </label>

                    {/* Current items */}
                    {editing.tiers[activeTier].items.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {editing.tiers[activeTier].items.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm"
                          >
                            <span className="flex-1 text-gray-900 dark:text-gray-100">
                              {item.display_name}
                              {item.is_addon && (
                                <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">(addon)</span>
                              )}
                            </span>
                            {item.unit_price != null && (
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                ${item.unit_price.toFixed(2)}
                              </span>
                            )}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(activeTier, iIdx, parseFloat(e.target.value) || 1)
                              }
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs text-center"
                              min="0.01"
                              step="0.01"
                            />
                            <button
                              onClick={() => removeItemFromTier(activeTier, iIdx)}
                              className="text-red-400 hover:text-red-600 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Item picker */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                      <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Search pricebook items..."
                          className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
                        />
                        <select
                          value={itemCategory}
                          onChange={(e) => setItemCategory(e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
                        >
                          <option value="all">All categories</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {filteredPricebookItems.slice(0, 50).map((item) => {
                          const alreadyAdded = editing.tiers[activeTier].items.some(
                            (i) => i.pricebook_item_id === item.id
                          );
                          return (
                            <button
                              key={item.id}
                              onClick={() => addItemToTier(item)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-3 py-1.5 text-xs border-b border-gray-100 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between ${
                                alreadyAdded ? "opacity-40" : ""
                              }`}
                            >
                              <span className="text-gray-900 dark:text-gray-100">
                                {item.display_name}
                                {item.manufacturer && (
                                  <span className="text-gray-400 ml-1">({item.manufacturer})</span>
                                )}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <span className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {item.category}
                                </span>
                                {item.unit_price != null && `$${item.unit_price.toFixed(2)}`}
                                {alreadyAdded ? " ✓" : " +"}
                              </span>
                            </button>
                          );
                        })}
                        {filteredPricebookItems.length === 0 && (
                          <p className="px-3 py-4 text-xs text-gray-400 text-center">No items found</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
